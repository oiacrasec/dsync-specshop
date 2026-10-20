"""Catálogo RBAC em Python puro; não concede acesso nem depende de Django."""

import re
from dataclasses import dataclass
from enum import StrEnum
from types import MappingProxyType

# Constantes ficam aqui, não em core/constants.py: o registry é Python puro, sem Django (ADR 0009).
PERMISSION_CODE_PATTERN = re.compile(r'[a-z][a-z0-9_]*:[a-z][a-z0-9_]*', re.ASCII)
STANDARD_ACTIONS = frozenset({'view', 'create', 'update', 'delete', 'manage', 'export'})


class PermissionScope(StrEnum):
    CONTRACT = 'CONTRACT'
    ORGANIZATION = 'ORGANIZATION'


@dataclass(frozen=True, slots=True)
class PermissionDefinition:
    code: str
    scopes: frozenset[PermissionScope]
    reserved: bool = False

    def __post_init__(self):
        if not isinstance(self.code, str) or PERMISSION_CODE_PATTERN.fullmatch(self.code) is None:
            raise ValueError('Invalid permission code.')
        scopes = frozenset(self.scopes)
        if not scopes or any(not isinstance(scope, PermissionScope) for scope in scopes):
            raise ValueError('Declare at least one valid permission scope.')
        if not isinstance(self.reserved, bool):
            raise ValueError('Reserved must be a boolean.')
        object.__setattr__(self, 'scopes', scopes)


class PermissionRegistry:
    def __init__(self, definitions):
        entries = {}
        for definition in definitions:
            if not isinstance(definition, PermissionDefinition):
                raise TypeError('Use PermissionDefinition entries.')
            if definition.code in entries:
                raise ValueError('Duplicate permission code.')
            entries[definition.code] = definition
        self._entries = MappingProxyType(entries)

    def __contains__(self, code):
        return code in self._entries

    def __iter__(self):
        return iter(self._entries.values())

    def get(self, code):
        """Código desconhecido gera KeyError; não existe permissão implícita."""
        return self._entries[code]

    def require_assignable(self, code, scope, *, essential_profile=False):
        """Valida catálogo/escopo/reserva; o chamador valida ator e perfil essencial.

        Não usar essential_profile a partir do payload; somente após verificar
        a identidade do perfil essencial no domínio de atribuições.
        """
        definition = self.get(code)
        if not isinstance(essential_profile, bool):
            raise ValueError('Essential profile must be a boolean.')
        if PermissionScope(scope) not in definition.scopes:
            raise ValueError('Permission does not allow this scope.')
        if definition.reserved and not essential_profile:
            raise ValueError('Permission is reserved for the essential contract administrator profile.')
        return definition


# Acrescentar códigos quando o domínio os exigir; leitura genérica não é liberada por este catálogo.
# Organizações (ADR 0037): o cliente decide quem vê e gerencia; criar só faz sentido no contrato.
_ANY_SCOPE = frozenset({PermissionScope.CONTRACT, PermissionScope.ORGANIZATION})
_CONTRACT_SCOPE = frozenset({PermissionScope.CONTRACT})

PERMISSIONS = PermissionRegistry(
    [
        PermissionDefinition('organization:view', _ANY_SCOPE),
        PermissionDefinition('organization:create', _ANY_SCOPE),
        PermissionDefinition('organization:update', _ANY_SCOPE),
        PermissionDefinition('organization:delete', _ANY_SCOPE),
        # Gestão reservada ao perfil essencial (ADR 0009 §3.1).
        *(
            PermissionDefinition(code, _CONTRACT_SCOPE, reserved=True)
            for code in (
                'user:view',
                'user:create',
                'user:update',
                'user:delete',
                'user:manage',
                'profile:view',
                'profile:create',
                'profile:update',
                'profile:delete',
                'assignment:create',
                'assignment:delete',
            )
        ),
    ]
)
