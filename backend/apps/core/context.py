"""Contexto de organização por requisição (ADR 0006 §3; etapas 3.3 e 2.3).

Lê o header X-Organization-Id. Usuário comum: organização do próprio contrato (o
contrato já foi conferido na autenticação). Superadmin: organização de qualquer
contrato não excluído, inclusive vencido ou inativo, para suporte (auditado na 3.6).
"""

from uuid import UUID

from .constants import ORGANIZATION_HEADER
from .exceptions import ContextForbidden, ContextInvalidRequest
from .tenancy import TenantContext, get_context, set_context, update_context

_UNRESOLVED = object()


def bind_user(request):
    """Camada C: contrato do usuário autenticado (ou superadmin sem contrato) no contexto.

    Chamado pelas classes de permissão, que rodam em toda view protegida.
    """
    user = request.user
    expected = TenantContext(superuser=True) if user.is_superuser else TenantContext(contract_id=user.contract_id)
    current = get_context()
    if current is None or (current.superuser, current.contract_id) != (expected.superuser, expected.contract_id):
        set_context(expected)


def resolve_organization(request):
    """Organização ativa do request (com cache no próprio request).

    Header ausente ou que não seja UUID → 400. Organização inexistente, excluída, inativa
    ou de outro contrato → 403, sem revelar qual dos casos ocorreu.
    """
    cached = getattr(request, '_dsc_organization', _UNRESOLVED)
    if cached is not _UNRESOLVED:
        return cached
    from apps.contracts.models import Organization

    raw = request.headers.get(ORGANIZATION_HEADER, '').strip()
    try:
        public_id = UUID(raw)
    except ValueError:
        raise ContextInvalidRequest() from None
    user = request.user
    bind_user(request)
    organization = None
    if user.is_superuser:
        organizations = Organization.objects.unscoped()  # Entra em qualquer contrato (auditado).
        organization = organizations.filter(
            public_id=public_id, is_active=True, contract__deleted_at__isnull=True
        ).first()
    elif user.contract_id is not None:
        organizations = Organization.objects.filter(public_id=public_id, is_active=True)  # Já no escopo do contrato.
        organization = organizations.filter(contract_id=user.contract_id).first()
    if organization is None:
        raise ContextForbidden()
    request._dsc_organization = organization
    request.organization = organization
    update_context(contract_id=organization.contract_id, organization_id=organization.pk)
    if user.is_superuser:
        from apps.audit.utils import mark_superadmin_entry

        mark_superadmin_entry(request, organization)
    return organization
