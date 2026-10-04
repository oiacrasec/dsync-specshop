from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.contracts.models import Contract, Organization, Plan
from apps.core import permission_registry
from apps.core.permission_registry import PermissionDefinition, PermissionRegistry, PermissionScope
from apps.rbac import services
from apps.rbac.models import Assignment, Profile
from apps.rbac.tests.test_permissions import assign, profile_with

pytestmark = pytest.mark.django_db
URL = '/api/v1/admin/organizations/'


@pytest.fixture
def world(monkeypatch):
    registry = PermissionRegistry(
        [PermissionDefinition('record:view', frozenset(PermissionScope)), *list(permission_registry.PERMISSIONS)]
    )
    monkeypatch.setattr(permission_registry, 'PERMISSIONS', registry)
    monkeypatch.setattr(services, 'PERMISSIONS', registry)
    admin = get_user_model().objects.create_superuser(username='org-admin')
    plan = Plan.objects.create(name='Plano')
    contract = Contract.objects.create(name='Cliente', plan=plan, start_date=date(2020, 1, 1), licenses=10)
    other = Contract.objects.create(name='Outro', plan=plan, start_date=date(2020, 1, 1), licenses=10)
    user = get_user_model().objects.create_user(username='org-user', contract=contract)
    own = Organization.objects.create(name='Permitida', contract=contract)
    denied = Organization.objects.create(name='Sem acesso', contract=contract)
    foreign = Organization.objects.create(name='Outro cliente', contract=other)
    return {
        'admin': admin,
        'user': user,
        'contract': contract,
        'other': other,
        'own': own,
        'denied': denied,
        'foreign': foreign,
    }


def client(user):
    api = APIClient()
    api.force_authenticate(user)
    return api


@pytest.mark.parametrize('action', ['', 'options/', 'schema/'])
def test_organizations_require_authentication(action):
    assert APIClient().get(URL + action).status_code == 401


def test_without_grants_no_organizations_or_details(world):
    api = client(world['user'])
    assert api.get(URL).json()['data'] == []
    assert api.get(URL + 'options/').json()['data'] == []
    assert api.get(f'{URL}{world["own"].public_id}/').status_code == 404


def test_list_detail_options_use_same_accessible_organizations(world):
    assign(world['admin'], world['user'], code='record:view', organization=world['own'])
    api = client(world['user'])
    response = api.get(URL, HTTP_X_ORGANIZATION_ID=str(world['foreign'].public_id))
    assert response.status_code == 200
    assert response.json()['data'] == [{'public_id': str(world['own'].public_id), 'name': 'Permitida'}]
    assert 'no-cache' in response['Cache-Control']
    assert api.get(f'{URL}{world["own"].public_id}/').status_code == 200
    for key in ('denied', 'foreign'):
        assert api.get(f'{URL}{world[key].public_id}/').status_code == 404
        assert api.get(URL + 'options/', {'public_id': str(world[key].public_id)}).json()['data'] == []
    assert api.get(URL, {'contract': str(world['other'].public_id)}).json()['data'] == []


def test_contract_grants_exclusions_and_inactive_profiles_are_respected(world):
    profile = profile_with(world['admin'], world['contract'], 'Leitor', 'record:view')
    grant = assign(world['admin'], world['user'], profile=profile, excluded=[world['denied']])
    api = client(world['user'])
    assert api.get(URL).json()['total_records'] == 1
    Profile.objects.filter(pk=profile.pk).update(is_active=False)
    assert api.get(URL).json()['data'] == []
    Profile.objects.filter(pk=profile.pk).update(is_active=True)
    Assignment.objects.filter(pk=grant.pk).update(is_active=False)
    assert api.get(URL).json()['data'] == []


def test_superadmin_filters_contract_and_cannot_read_deleted_context(world):
    Organization.objects.create(name='Inativa', contract=world['contract'], is_active=False)
    Organization.objects.create(name='Excluída', contract=world['contract']).delete()
    api = client(world['admin'])
    assert api.get(URL, {'contract': str(world['contract'].public_id)}).json()['total_records'] == 2
    world['other'].delete()
    assert api.get(f'{URL}{world["foreign"].public_id}/').status_code == 404
    assert api.get(URL).json()['total_records'] == 2


@pytest.mark.parametrize('params', [{'contract': 'invalid'}, {'rows': 101}, {'ordering': 'contract__name'}])
def test_invalid_query_is_rfc9457(world, params):
    response = client(world['admin']).get(URL, params)
    assert response.status_code == 422
    assert response['Content-Type'] == 'application/problem+json'


@pytest.mark.parametrize('method', ['post', 'put', 'patch', 'delete'])
def test_organizations_are_read_only(world, method):
    url = URL if method == 'post' else f'{URL}{world["own"].public_id}/'
    assert getattr(client(world['admin']), method)(url, {}, format='json').status_code == 405


def test_schema_is_readable_and_previous_nested_route_removed(world):
    api = client(world['user'])
    assert api.get(URL + 'schema/').json()['columns'] == [{'field': 'name', 'label': 'Nome'}]
    assert (
        client(world['admin']).get(f'/api/v1/admin/contracts/{world["contract"].public_id}/organizations/').status_code
        == 404
    )


@pytest.mark.parametrize('action', ['', 'options/'])
def test_reads_have_constant_queries_no_writes_or_locks(world, action):
    profile = profile_with(world['admin'], world['contract'], 'Leitor', 'record:view')
    assign(world['admin'], world['user'], profile=profile)
    api = client(world['user'])
    counts = []
    for count in (1, 30):
        Organization.objects.bulk_create(
            Organization(name=f'Filial {count}-{index}', contract=world['contract']) for index in range(count)
        )
        with CaptureQueriesContext(connection) as captured:
            response = api.get(URL + action)
        assert response.status_code == 200
        queries = [query['sql'] for query in captured.captured_queries]
        assert not any(query.startswith(('INSERT', 'UPDATE', 'DELETE')) or 'FOR UPDATE' in query for query in queries)
        counts.append(sum(query.startswith('SELECT') for query in queries))
    assert counts == [5, 5]  # Três consultas RBAC, COUNT e página.
