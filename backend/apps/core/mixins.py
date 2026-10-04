"""Comportamentos HTTP compartilhados, compostos pelas views base do core."""

from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.rbac.permissions import LookupOptionsPermission, RequiredPermission

from .models import HybridScopedModel
from .schema import column_schema, filter_schema, model_field
from .selectors import lookup_options
from .serializers import OptionsQuerySerializer
from .utils import context_values


class SerializerDeleteMixin:
    """Exclusão com autoria e auditoria pelo serializer base."""

    def perform_destroy(self, instance):
        self.get_serializer(instance).delete()


class ListFilterMixin:
    def filter_queryset(self, queryset):
        if self.action != 'list':
            return queryset
        return super().filter_queryset(queryset)


class TableSchemaMixin:
    schema_columns = ()
    schema_filters = ()
    schema_column_overrides = {}
    schema_filter_overrides = {}
    schema_options_routes = {}

    def get_schema_columns(self):
        model = self.serializer_class.Meta.model
        return [column_schema(model, name, self.schema_column_overrides.get(name, {})) for name in self.schema_columns]

    def get_schema_filters(self):
        model = self.serializer_class.Meta.model
        result = []
        for name in dict.fromkeys(('is_active', *self.schema_filters)):
            if name not in self.filterset_class.base_filters:
                raise ImproperlyConfigured(f'Declare a FilterSet filter before exposing it in schema: {name}.')
            field = model_field(model, name)
            overrides = self.schema_filter_overrides.get(name, {})
            options_url = overrides.get('options_url')
            if field.is_relation and options_url is None:
                route = self.schema_options_routes.get(field.related_model)
                if route is None:
                    raise ImproperlyConfigured('Register the related options route or declare an options_url override.')
                namespace = self.request.resolver_match.namespace
                options_url = reverse(
                    f'{namespace}:{route}' if namespace else route, urlconf=getattr(self.request, 'urlconf', None)
                )
            result.append(filter_schema(model, name, overrides, options_url))
        return result

    @action(detail=False, methods=['get'])
    def schema(self, request):
        return Response(
            {
                'columns': self.get_schema_columns(),
                'filters': self.get_schema_filters(),
                'general_search': self.filterset_class.get_general_search_schema(),
                'ordering_fields': tuple(self.filterset_class.base_filters['ordering'].param_map),
            }
        )


class TenantScopedViewMixin:
    """Para GenericAPIView/ViewSet de models com escopo.

    Declare `model` (nunca `queryset` no nível da classe: o manager com escopo exige
    contexto, que só existe durante a requisição). Leitura pelo manager com escopo;
    registro fora do contexto → 404. Create/update gravam contrato e organização do
    contexto e a autoria; valores do payload são ignorados.
    """

    model = None

    def get_queryset(self):
        return self.model.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(**context_values(self.model), created_by=user, updated_by=user)

    def perform_update(self, serializer):
        self._ensure_writable(serializer.instance)
        serializer.save(**context_values(self.model), updated_by=self.request.user)

    def perform_destroy(self, instance):
        self._ensure_writable(instance)
        instance.delete(actor=self.request.user)

    def _ensure_writable(self, instance):
        # Registro do sistema (Hybrid sem contrato) é visível ao cliente, mas só o superadmin altera (§1.1).
        if isinstance(instance, HybridScopedModel) and instance.contract_id is None:
            raise PermissionDenied(_('Registros do sistema só podem ser alterados pela administração.'))


class LookupOptionsMixin:
    """Adiciona options ao ViewSet. Declare rótulo SQL, campos de busca e permissão :view.

    Exemplo: options_label_field = 'name', options_search_fields = ('name',).
    get_queryset() deve preservar tenant e incluir inativos; o selector aplica os
    filtros de seleção. Não use propriedades Python ou relações multivaloradas.
    """

    options_label_field = None
    options_search_fields = ()
    options_permission_class = LookupOptionsPermission

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.action == 'options':
            # Preserva restrições adicionais (por exemplo, administração).
            permissions = [permission for permission in permissions if type(permission) is not RequiredPermission]
            permissions.append(self.options_permission_class())
        return permissions

    @action(detail=False, methods=['get'])
    def options(self, request):
        if not self.options_label_field or not self.options_search_fields:
            raise ImproperlyConfigured('Options requires explicit label and search fields.')
        serializer = OptionsQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        result = lookup_options(
            queryset=self.get_queryset(),
            label_field=self.options_label_field,
            search_fields=self.options_search_fields,
            **serializer.validated_data,
        )
        return Response(result)
