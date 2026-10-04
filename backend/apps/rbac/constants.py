"""Constantes do RBAC: só valores literais.

As migrations rbac.0001/0002 mantêm o valor literal: migration não importa código do app.
"""

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
