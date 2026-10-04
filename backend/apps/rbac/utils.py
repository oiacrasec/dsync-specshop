"""Auxiliares da autorização do DRF (usados por `permissions.py`)."""

from apps.core import permission_registry

from .evaluation import evaluate
from .selectors import user_grants


def required_permission(request, view):
    declared = getattr(view, 'required_permission', None)
    if isinstance(declared, dict):
        action = getattr(view, 'action', None)
        return declared.get(action) if action in declared else declared.get(request.method)
    return declared


def access_evaluation(request, organization):
    """Calcula uma vez por requisição e organização."""
    cache = request.__dict__.setdefault('_dsc_access', {})
    key = organization.pk if organization is not None else None
    if key not in cache:
        user = request.user
        registry = permission_registry.PERMISSIONS
        if user.is_superuser:
            cache[key] = evaluate((), key, registry=registry, superuser=True)
        else:
            # As concessões identificam organizações pela PK; o cálculo compara a mesma chave.
            cache[key] = evaluate(user_grants(user), key, registry=registry)
    return cache[key]
