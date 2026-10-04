"""Contexto de organização por requisição (ADR 0006 §3; etapas 3.3 e 2.3).

Lê o header X-Organization-Id. Usuário comum: organização do próprio contrato (o
contrato já foi conferido na autenticação). Superadmin: organização de qualquer
contrato não excluído, inclusive vencido ou inativo, para suporte (auditado na 3.6).
"""

from uuid import UUID

from .exceptions import ContextForbidden, ContextInvalidRequest

HEADER = 'X-Organization-Id'
_UNRESOLVED = object()


def resolve_organization(request):
    """Organização ativa do request (com cache no próprio request).

    Header ausente ou que não seja UUID → 400. Organização inexistente, excluída, inativa
    ou de outro contrato → 403, sem revelar qual dos casos ocorreu.
    """
    cached = getattr(request, '_dsc_organization', _UNRESOLVED)
    if cached is not _UNRESOLVED:
        return cached
    from apps.contracts.models import Organization

    raw = request.headers.get(HEADER, '').strip()
    try:
        public_id = UUID(raw)
    except ValueError:
        raise ContextInvalidRequest() from None
    user = request.user
    organizations = Organization.objects.filter(public_id=public_id, is_active=True)
    organization = None
    if user.is_superuser:
        organization = organizations.filter(contract__deleted_at__isnull=True).first()
    elif user.contract_id is not None:
        organization = organizations.filter(contract_id=user.contract_id).first()
    if organization is None:
        raise ContextForbidden()
    request._dsc_organization = organization
    request.organization = organization
    if user.is_superuser:
        from apps.audit.middleware import mark_superadmin_entry

        mark_superadmin_entry(request, organization)
    return organization
