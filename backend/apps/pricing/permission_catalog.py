"""Permissões da pesquisa (ADR 0044, ADR 2003 §5): executar = create, tentar de novo = update."""

from django.utils.translation import gettext_lazy as _

from apps.core.permission_registry import PermissionDefinition, PermissionScope

_ANY_SCOPE = frozenset({PermissionScope.CONTRACT, PermissionScope.ORGANIZATION})

PERMISSIONS = [
    PermissionDefinition('search:view', _ANY_SCOPE),
    PermissionDefinition('search:create', _ANY_SCOPE),
    PermissionDefinition('search:update', _ANY_SCOPE),
]
RESOURCE_LABELS = {'search': _('Pesquisas de preços')}
PERMISSION_LABELS = {'search:create': _('Executar'), 'search:update': _('Tentar de novo')}
