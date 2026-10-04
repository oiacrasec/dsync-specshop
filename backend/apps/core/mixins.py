"""Comportamentos HTTP compartilhados, compostos pelas views base do core."""

from django.core.exceptions import ImproperlyConfigured
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.rbac.permissions import LookupOptionsPermission, RequiredPermission

from .models import HybridScopedModel
from .selectors import lookup_options
from .serializers import OptionsQuerySerializer
from .utils import context_values


class SelectorQuerysetMixin:
    def get_queryset(self):
        return self.queryset_selector()


class ServiceWriteMixin:
    """Encaminha escritas aos services declarados como staticmethod pelo recurso."""

    def perform_create(self, serializer):
        serializer.instance = self.save_service(values=serializer.validated_data, actor=self.request.user)

    def perform_update(self, serializer):
        serializer.instance = self.save_service(
            instance=serializer.instance, values=serializer.validated_data, actor=self.request.user
        )

    def perform_destroy(self, instance):
        self.delete_service(instance=instance, actor=self.request.user)


class ListFilterMixin:
    ordering_fields = ('name', 'created_at', 'updated_at')

    def filter_queryset(self, queryset):
        if self.action != 'list':
            return queryset
        return super().filter_queryset(queryset)


class TableSchemaMixin:
    schema_columns = ()
    schema_filters = ()

    @action(detail=False, methods=['get'])
    def schema(self, request):
        return Response(
            {
                'columns': [{'field': field, 'label': label} for field, label in self.schema_columns],
                'filters': [{'field': 'is_active', 'label': _('Ativo'), 'type': 'boolean'}, *self.schema_filters],
                'ordering_fields': self.ordering_fields,
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
