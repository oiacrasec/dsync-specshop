"""Auxiliares da autorização do DRF (usados por `permissions.py`)."""

from apps.core import permission_registry

from .evaluation import evaluate, granted_codes
from .selectors import user_grants


def required_permission(request, view):
    declared = getattr(view, 'required_permission', None)
    if isinstance(declared, dict):
        action = getattr(view, 'action', None)
        return declared.get(action) if action in declared else declared.get(request.method)
    return declared


def request_grants(request):
    """Concessões do usuário, carregadas uma vez por requisição."""
    if '_dsc_grants' not in request.__dict__:
        user = request.user
        request.__dict__['_dsc_grants'] = () if user.is_superuser else tuple(user_grants(user))
    return request.__dict__['_dsc_grants']


def access_evaluation(request, organization):
    """Calcula uma vez por requisição e organização."""
    cache = request.__dict__.setdefault('_dsc_access', {})
    key = organization.pk if organization is not None else None
    if key not in cache:
        registry = permission_registry.PERMISSIONS
        # As concessões identificam organizações pela PK; o cálculo compara a mesma chave.
        cache[key] = evaluate(request_grants(request), key, registry=registry, superuser=request.user.is_superuser)
    return cache[key]


def contract_codes(request):
    """Códigos concedidos em qualquer escopo do contrato (ADR 0037), uma vez por requisição."""
    if '_dsc_contract_codes' not in request.__dict__:
        request.__dict__['_dsc_contract_codes'] = granted_codes(
            request_grants(request), registry=permission_registry.PERMISSIONS, superuser=request.user.is_superuser
        )
    return request.__dict__['_dsc_contract_codes']
