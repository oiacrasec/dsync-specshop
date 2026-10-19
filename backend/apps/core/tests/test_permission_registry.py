import ast
from dataclasses import FrozenInstanceError
from pathlib import Path

import pytest

from apps.core.permission_registry import (
    PERMISSIONS,
    STANDARD_ACTIONS,
    PermissionDefinition,
    PermissionRegistry,
    PermissionScope,
)

CONTRACT = PermissionScope.CONTRACT
ORGANIZATION = PermissionScope.ORGANIZATION


@pytest.mark.parametrize('code', ['', 'user', 'User:view', 'user:*', '*:view', 'user:view:extra', 'user:view\n'])
def test_invalid_permission_codes_are_rejected(code):
    with pytest.raises(ValueError):
        PermissionDefinition(code, frozenset({CONTRACT}))


@pytest.mark.parametrize('scopes', [set(), {'UNKNOWN'}, {'CONTRACT'}, {None}])
def test_definitions_require_explicit_typed_scopes(scopes):
    with pytest.raises(ValueError):
        PermissionDefinition('record:view', scopes)


def test_definition_is_immutable_and_copies_input_scopes():
    scopes = {CONTRACT}
    definition = PermissionDefinition('record:view', scopes)
    scopes.add(ORGANIZATION)
    assert definition.scopes == frozenset({CONTRACT})
    with pytest.raises(FrozenInstanceError):
        definition.reserved = True
    with pytest.raises(ValueError):
        PermissionDefinition('record:view', {CONTRACT}, reserved=1)


def test_registry_rejects_duplicates_and_unknown_permissions():
    definition = PermissionDefinition('record:view', {CONTRACT, ORGANIZATION})
    with pytest.raises(ValueError):
        PermissionRegistry([definition, definition])
    with pytest.raises(TypeError):
        PermissionRegistry(['record:view'])
    registry = PermissionRegistry([definition])
    assert 'record:view' in registry
    assert 'record:delete' not in registry
    with pytest.raises(KeyError):
        registry.require_assignable('record:delete', CONTRACT)


def test_non_reserved_permissions_accept_both_declared_scopes():
    definition = PermissionDefinition('record:view', {CONTRACT, ORGANIZATION})
    registry = PermissionRegistry([definition])
    assert registry.require_assignable('record:view', CONTRACT) is definition
    assert registry.require_assignable('record:view', ORGANIZATION) is definition


@pytest.mark.parametrize('definition', [item for item in PERMISSIONS if item.reserved], ids=lambda item: item.code)
def test_reserved_permissions_are_rejected_for_customer_profiles_and_individual_grants(definition):
    assert definition.scopes == frozenset({CONTRACT})
    with pytest.raises(ValueError):
        PERMISSIONS.require_assignable(definition.code, CONTRACT)
    assert PERMISSIONS.require_assignable(definition.code, CONTRACT, essential_profile=True) is definition
    with pytest.raises(ValueError):
        PERMISSIONS.require_assignable(definition.code, ORGANIZATION, essential_profile=True)


def test_invalid_scope_and_essential_profile_flag_never_allow_assignment():
    with pytest.raises(ValueError):
        PERMISSIONS.require_assignable('user:create', 'GLOBAL', essential_profile=True)
    with pytest.raises(ValueError):
        PERMISSIONS.require_assignable('user:create', CONTRACT, essential_profile='true')


def test_manage_has_no_implicit_permissions():
    registry = PermissionRegistry([PermissionDefinition('user:manage', {CONTRACT})])
    assert registry.get('user:manage').code == 'user:manage'
    with pytest.raises(KeyError):
        registry.get('user:delete')
    assert STANDARD_ACTIONS == {'view', 'create', 'update', 'delete', 'manage', 'export'}


def test_registry_does_not_import_framework_or_project_runtime():
    source = Path(__file__).parents[1] / 'permission_registry.py'
    tree = ast.parse(source.read_text(encoding='utf-8'))
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            assert node.level == 0
            assert node.module.split('.')[0] not in {'django', 'rest_framework', 'apps', 'config'}
        elif isinstance(node, ast.Import):
            assert all(
                alias.name.split('.')[0] not in {'django', 'rest_framework', 'apps', 'config'} for alias in node.names
            )


def test_organization_permissions_are_assignable_by_the_customer():
    # ADR 0037: deixam de ser reservadas; criar só no escopo do contrato.
    assert {item.code for item in PERMISSIONS if item.code.startswith('organization:')} == {
        'organization:view',
        'organization:create',
        'organization:update',
        'organization:delete',
    }
    for code in ('organization:view', 'organization:update', 'organization:delete'):
        assert not PERMISSIONS.get(code).reserved
        assert PERMISSIONS.require_assignable(code, CONTRACT).code == code
        assert PERMISSIONS.require_assignable(code, ORGANIZATION).code == code
    assert PERMISSIONS.require_assignable('organization:create', CONTRACT).code == 'organization:create'
    with pytest.raises(ValueError):
        PERMISSIONS.require_assignable('organization:create', ORGANIZATION)


def test_user_profile_and_assignment_management_stay_reserved():
    reserved = {item.code for item in PERMISSIONS if item.reserved}
    assert reserved == {
        'user:create',
        'user:update',
        'user:manage',
        'profile:create',
        'profile:update',
        'profile:delete',
        'assignment:create',
        'assignment:delete',
    }
