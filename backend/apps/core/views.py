"""Camada D (ADR 0006 §1.3 e §4): views com escopo gravam o contexto, nunca o payload."""

from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import PermissionDenied

from .models import ContractScopedModel, HybridScopedModel, OrganizationScopedModel
from .tenancy import TenantContextMissing, get_context


def context_values(model):
    """`contract_id`/`organization_id` do contexto validado para o tipo de escopo do model."""
    context = get_context()
    if context is None or context.contract_id is None:
        raise TenantContextMissing(f'{model._meta.label} exige contrato no contexto para gravar.')
    if issubclass(model, OrganizationScopedModel):
        if context.organization_id is None:
            raise TenantContextMissing(f'{model._meta.label} exige organização no contexto para gravar.')
        return {'contract_id': context.contract_id, 'organization_id': context.organization_id}
    if issubclass(model, ContractScopedModel | HybridScopedModel):
        return {'contract_id': context.contract_id}
    return {}


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
