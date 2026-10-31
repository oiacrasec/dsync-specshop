from unittest.mock import Mock

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.contracts.models import Contract, Organization
from apps.core.permission_registry import PERMISSIONS, PermissionScope
from apps.rbac import services
from apps.rbac.models import Assignment, AssignmentExclusion, Profile, ProfilePermission
from apps.rbac.tests.test_permissions import assign, profile_with

pytestmark = pytest.mark.django_db
URL = '/api/v1/me/access/'


@pytest.fixture
def world(user_contract):
    root = get_user_model().objects.create_superuser(username='root')
    user = get_user_model().objects.create_user(username='maria', contract=user_contract)
    main = Organization.objects.create(name='Matriz', contract=user_contract)
    branch = Organization.objects.create(name='Filial', contract=user_contract)
    reader = profile_with(root, user_contract, 'Leitor', 'organization:view', 'organization:update')
    return root, user, main, branch, reader


def get(user, **headers):
    api = APIClient()
    api.force_authenticate(user)
    return api.get(URL, **headers)


def test_own_effective_access_respects_exceptions_and_returns_only_assigned_profiles(world):
    root, user, main, branch, reader = world
    assignment = assign(root, user, profile=reader)
    services.save_exclusion(
        exclusion=AssignmentExclusion(
            assignment=assignment,
            contract=user.contract,
            excluded_organization=main,
            permission_code='organization:update',
        ),
        actor=root,
    )
    assign(root, user, code='organization:create', organization=main)
    profile_with(root, user.contract, 'Perfil não atribuído', 'organization:delete')
    response = get(user)
    assert response.status_code == 200, response.content
    assert 'no-store' in response['Cache-Control']
    organizations = response.json()['organizations']
    assert [item['name'] for item in organizations] == ['Filial', 'Matriz']
    by_id = {item['public_id']: item for item in organizations}
    assert by_id[str(main.public_id)] == {
        'public_id': str(main.public_id),
        'name': 'Matriz',
        'profiles': [{'public_id': str(reader.public_id), 'name': 'Leitor'}],
        'permissions': ['organization:create', 'organization:view'],
        'all_permissions': False,
    }
    assert by_id[str(branch.public_id)]['permissions'] == ['organization:update', 'organization:view']
    # O header não seleciona nem restringe este retrato da própria conta.
    assert get(user, HTTP_X_ORGANIZATION_ID='inválido').json() == response.json()


def test_organization_exclusion_and_direct_grant_restore_access_without_the_excluded_profile(world):
    root, user, main, branch, reader = world
    assign(root, user, profile=reader, excluded=[branch])
    assert [item['public_id'] for item in get(user).json()['organizations']] == [str(main.public_id)]
    assign(root, user, code='organization:create', organization=branch)
    branch_data = get(user).json()['organizations'][0]
    assert branch_data['public_id'] == str(branch.public_id)
    assert branch_data['profiles'] == []
    assert branch_data['permissions'] == ['organization:create']


def test_other_contracts_users_and_unavailable_organizations_are_not_exposed(world):
    root, user, main, branch, reader = world
    assign(root, user, profile=reader)
    Organization.objects.filter(pk=branch.pk).update(is_active=False)
    removed = Organization.objects.create(name='Excluída', contract=user.contract)
    removed.delete()
    other = Contract.objects.create(name='Outro', start_date='2020-01-01', licenses=10)
    Organization.objects.create(name='Externa', contract=other)
    other_profile = profile_with(root, other, 'Perfil externo', 'organization:view')
    # Dados inconsistentes não ganham acesso nem vazam metadados.
    Assignment.objects.create(contract=user.contract, user=user, profile=other_profile, scope=PermissionScope.CONTRACT)
    another_user = get_user_model().objects.create_user(username='outro', contract=user.contract)
    private = profile_with(root, user.contract, 'Perfil de outra pessoa', 'organization:delete')
    assign(root, another_user, profile=private)
    data = get(user).json()['organizations']
    assert data == [
        {
            'public_id': str(main.public_id),
            'name': 'Matriz',
            'profiles': [{'public_id': str(reader.public_id), 'name': 'Leitor'}],
            'permissions': ['organization:update', 'organization:view'],
            'all_permissions': False,
        }
    ]


def test_inactive_and_deleted_assignments_or_profiles_do_not_grant_access(world):
    root, user, main, branch, reader = world
    assignment = assign(root, user, profile=reader)
    Assignment.objects.filter(pk=assignment.pk).update(is_active=False)
    assert get(user).json() == {'organizations': []}
    Assignment.objects.filter(pk=assignment.pk).update(is_active=True)
    Profile.objects.filter(pk=reader.pk).update(is_active=False)
    assert get(user).json() == {'organizations': []}
    Profile.objects.filter(pk=reader.pk).update(is_active=True, deleted_at='2026-01-01T00:00:00Z')
    assert get(user).json() == {'organizations': []}
    Profile.all_objects.filter(pk=reader.pk).update(deleted_at=None)
    Assignment.objects.filter(pk=assignment.pk).update(deleted_at='2026-01-01T00:00:00Z')
    assert get(user).json() == {'organizations': []}


def test_essential_profile_has_all_current_and_future_permissions(world, essential_profile, monkeypatch):
    from apps.core.permission_registry import PermissionDefinition, PermissionRegistry
    from apps.rbac import selectors

    root, user, main, branch, _ = world
    assign(root, user, profile=essential_profile)
    future = PermissionRegistry([*PERMISSIONS, PermissionDefinition('future:view', frozenset(PermissionScope))])
    monkeypatch.setattr(selectors, 'PERMISSIONS', future)
    organizations = get(user).json()['organizations']
    assert len(organizations) == 2
    for item in organizations:
        assert item['all_permissions']
        assert item['profiles'] == [{'public_id': str(essential_profile.public_id), 'name': essential_profile.name}]
        assert item['permissions'] == sorted(definition.code for definition in future)


def test_profile_is_deduplicated_and_empty_effective_permissions_keep_organization_access(world):
    root, user, main, branch, reader = world
    assign(root, user, profile=reader)
    assign(root, user, profile=reader, organization=main)
    assert len(get(user).json()['organizations'][1]['profiles']) == 1
    ProfilePermission.objects.filter(profile=reader).update(deleted_at='2026-01-01T00:00:00Z')
    assert all(item['permissions'] == [] for item in get(user).json()['organizations'])


def test_authentication_and_read_only_methods(world):
    assert APIClient().get(URL).status_code == 401
    _, user, *_ = world
    api = APIClient()
    api.force_authenticate(user)
    for method in ('post', 'put', 'patch', 'delete'):
        response = getattr(api, method)(URL)
        assert response.status_code == 405
        assert response['Content-Type'] == 'application/problem+json'


def test_superadmin_is_denied_before_loading_access(world, monkeypatch):
    root, *_ = world
    selector = Mock()
    monkeypatch.setattr('apps.rbac.views.my_access', selector)
    response = get(root)
    assert response.status_code == 403
    assert response.json()['type'] == 'urn:dsync:problem:permission-denied'
    assert response['Content-Type'] == 'application/problem+json'
    assert 'no-store' in response['Cache-Control']
    selector.assert_not_called()


def test_queries_are_constant_with_more_organizations_profiles_and_exclusions_and_read_never_writes(world):
    root, user, main, branch, reader = world
    assign(root, user, profile=reader, excluded=[branch])
    with CaptureQueriesContext(connection) as few:
        assert get(user).status_code == 200
    for index in range(30):
        organization = Organization.objects.create(name=f'Org {index}', contract=user.contract)
        profile = profile_with(root, user.contract, f'Perfil {index}', 'organization:view')
        assign(root, user, profile=profile, organization=organization)
    with CaptureQueriesContext(connection) as many:
        response = get(user)
    assert len(response.json()['organizations']) == 31
    assert len(many) == len(few)
    assert sum('SELECT' in query['sql'] for query in many) == 4
    assert not [query for query in many if query['sql'].startswith(('INSERT', 'UPDATE', 'DELETE'))]


def test_global_permission_exception_can_be_restored_by_another_grant(world):
    root, user, main, branch, reader = world
    assignment = assign(root, user, profile=reader)
    services.save_exclusion(
        exclusion=AssignmentExclusion(
            assignment=assignment, contract=user.contract, permission_code='organization:view'
        ),
        actor=root,
    )
    assign(root, user, code='organization:view', organization=main)
    organizations = get(user).json()['organizations']
    assert organizations[0]['permissions'] == ['organization:update']
    assert organizations[1]['permissions'] == ['organization:update', 'organization:view']


def test_jwt_authentication_preserves_contract_and_password_change_guards(world):
    from rest_framework_simplejwt.tokens import AccessToken

    _, user, *_ = world
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(user)}')
    assert api.get(URL).status_code == 200
    user.must_change_password = True
    user.save(update_fields=['must_change_password'])
    assert api.get(URL).json()['type'] == 'urn:dsync:problem:password-change-required'
    user.must_change_password = False
    user.save(update_fields=['must_change_password'])
    Contract.objects.filter(pk=user.contract_id).update(is_active=False)
    response = api.get(URL)
    assert response.status_code == 403
    assert response.json()['type'] == 'urn:dsync:problem:contract-inactive'
