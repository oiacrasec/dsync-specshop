"""Constantes do RBAC: só valores literais.

As migrations rbac.0001/0002 mantêm o valor literal: migration não importa código do app.
"""

from django.utils.translation import gettext_lazy as _

# Perfil essencial "Administrador do contrato" (ADR 0009 §5).
ESSENTIAL_PROFILE_KEY = 'contract_admin'

# Campos auditados por model, pelo label (FKs pelo public_id; ADR 0017).
AUDIT_FIELDS = {
    'rbac.Profile': {'name': 'name', 'contract': 'contract__public_id', 'is_active': 'is_active'},
    'rbac.ProfilePermission': {
        'profile': 'profile__public_id',
        'permission_code': 'permission_code',
        'is_active': 'is_active',
    },
    'rbac.Assignment': {
        'user': 'user__public_id',
        'profile': 'profile__public_id',
        'permission_code': 'permission_code',
        'scope': 'scope',
        'scope_organization': 'scope_organization__public_id',
        'is_active': 'is_active',
    },
    'rbac.AssignmentExclusion': {
        'assignment': 'assignment__public_id',
        'excluded_organization': 'excluded_organization__public_id',
        'is_active': 'is_active',
    },
}

# Rótulos do catálogo de permissões para a interface (o registry segue Python puro).
RESOURCE_LABELS = {
    'organization': _('Organizações'),
    'user': _('Usuários'),
    'profile': _('Perfis'),
    'assignment': _('Atribuições'),
}
ACTION_LABELS = {
    'view': _('Visualizar'),
    'create': _('Criar'),
    'update': _('Editar'),
    'delete': _('Excluir'),
    'manage': _('Gerenciar'),
    'export': _('Exportar'),
}
