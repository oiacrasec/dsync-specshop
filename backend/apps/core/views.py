"""Views do core: fallback de rotas da API e mixin da camada D (ADR 0006 §1.3 e §4)."""

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.rbac.permissions import LookupOptionsPermission, RequiredPermission

from .models import HybridScopedModel
from .problems import problem_http_response
from .selectors import lookup_options
from .serializers import OptionsQuerySerializer
from .utils import context_values


@transaction.non_atomic_requests
def api_not_found(request):
    """Fallback de rotas: também evita a página de boas-vindas em DEBUG."""
    return problem_http_response(request, 404)


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
