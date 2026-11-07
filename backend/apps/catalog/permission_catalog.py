"""Permissões do catálogo (ADR 0044, ADR 2003 §5): arquivar é a ação padrão `delete`."""

from django.utils.translation import gettext_lazy as _

from apps.core.permission_registry import PermissionDefinition, PermissionScope

_ANY_SCOPE = frozenset({PermissionScope.CONTRACT, PermissionScope.ORGANIZATION})

PERMISSIONS = [
    PermissionDefinition('product:view', _ANY_SCOPE),
    PermissionDefinition('product:create', _ANY_SCOPE),
    PermissionDefinition('product:update', _ANY_SCOPE),
    PermissionDefinition('product:delete', _ANY_SCOPE),
]
RESOURCE_LABELS = {'product': _('Produtos')}
PERMISSION_LABELS = {'product:delete': _('Arquivar')}
