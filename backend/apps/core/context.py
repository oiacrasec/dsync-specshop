"""Contexto mínimo de organização (pedaço da etapa 2.3 antecipado na 3.3).

Lê o header X-Organization-Id e resolve a organização dentro do contrato do usuário.
Contrato ativo a cada requisição e superadmin com organização opcional ficam na 2.3.
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
    contract_id = getattr(request.user, 'contract_id', None)
    organization = None
    if contract_id is not None:
        organization = Organization.objects.filter(public_id=public_id, contract_id=contract_id, is_active=True).first()
    if organization is None:
        raise ContextForbidden()
    request._dsc_organization = organization
    request.organization = organization
    return organization
