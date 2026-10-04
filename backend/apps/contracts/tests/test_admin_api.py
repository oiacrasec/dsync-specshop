from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import close_old_connections, connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit.models import AccessLog, AuditEvent, AuditEventType
from apps.contracts import services
from apps.contracts.models import Contract, Organization, Plan
from apps.core.exceptions import LicenseLimitReached

pytestmark = pytest.mark.django_db


@pytest.fixture
def world():
    admin = get_user_model().objects.create_superuser(username='admin')
    plan = Plan.objects.create(name='Plano')
    contract = Contract.objects.create(name='Cliente', plan=plan, start_date=date(2020, 1, 1), licenses=5)
    user = get_user_model().objects.create_user(username='comum', contract=contract)
    api = APIClient()
    api.force_authenticate(admin)
    return {'admin': admin, 'plan': plan, 'contract': contract, 'user': user, 'api': api}


def contract_payload(world, **extra):
    return {'name': 'Novo', 'plan': str(world['plan'].public_id), 'start_date': '2020-01-01', 'licenses': 5, **extra}


@pytest.mark.parametrize('resource', ['plans', 'contracts'])
@pytest.mark.parametrize('action', ['', 'options/', 'schema/'])
def test_admin_routes_require_superadmin_without_organization(world, resource, action):
    url = f'/api/v1/admin/{resource}/{action}'
    assert APIClient().get(url).status_code == 401
    common = APIClient()
    common.force_authenticate(world['user'])
    assert common.get(url).status_code == 403
    assert world['api'].get(url).status_code == 200
    world['api'].credentials(HTTP_X_ORGANIZATION_ID='invalid-ignored-header')
    assert world['api'].get(url).status_code == 200


@pytest.mark.parametrize('method', ['post', 'patch', 'put', 'delete'])
def test_common_user_cannot_write_admin_resource(world, method):
    common = APIClient()
    common.force_authenticate(world['user'])
    url = '/api/v1/admin/contracts/'
    if method != 'post':
        url += f'{world["contract"].public_id}/'
    assert getattr(common, method)(url, contract_payload(world), format='json').status_code == 403


def test_plan_crud_autorship_and_audit(world):
    api = world['api']
    response = api.post('/api/v1/admin/plans/', {'name': 'Premium', 'max_organizations': 10}, format='json')
    assert response.status_code == 201, response.content
    data = response.json()
    assert 'id' not in data and 'created_by' not in data
    plan = Plan.objects.get(public_id=data['public_id'])
    assert plan.created_by == world['admin'] and plan.updated_by == world['admin']
    url = f'/api/v1/admin/plans/{plan.public_id}/'
    assert api.patch(url, {'max_organizations': 20}, format='json').status_code == 200
    assert api.delete(url).status_code == 204
    assert api.get(url).status_code == 404
    plan.refresh_from_db()
    assert plan.deleted_by == world['admin'] and plan.deleted_at is not None
    events = list(AuditEvent.objects.filter(target_public_id=plan.public_id).order_by('created_at'))
    assert [event.event for event in events] == [
        AuditEventType.PLAN_CREATED,
        AuditEventType.PLAN_UPDATED,
        AuditEventType.PLAN_DELETED,
    ]
    assert events[1].changes['before']['max_organizations'] == 10
    assert events[1].changes['after']['max_organizations'] == 20
    assert 'Premium' not in str([event.changes for event in events])


def test_contract_crud_uses_uuid_and_preserves_dependents(world):
    api = world['api']
    response = api.post('/api/v1/admin/contracts/', contract_payload(world), format='json')
    assert response.status_code == 201, response.content
    assert response.json()['plan'] == str(world['plan'].public_id)
    contract = Contract.objects.get(public_id=response.json()['public_id'])
    org = Organization.objects.create(name='Unidade', contract=contract)
    url = f'/api/v1/admin/contracts/{contract.public_id}/'
    assert api.patch(url, {'is_active': False}, format='json').status_code == 200
    assert api.delete(url).status_code == 204
    assert api.get(url).status_code == 404
    org.refresh_from_db()
    assert org.deleted_at is None
    events = AuditEvent.objects.filter(target_public_id=contract.public_id)
    assert events.count() == 3 and all(event.contract_id == contract.pk for event in events)


def test_license_reduction_counts_inactive_and_ignores_deleted_users(world):
    contract = world['contract']
    get_user_model().objects.create_user(username='inativo', contract=contract, is_active=False)
    url = f'/api/v1/admin/contracts/{contract.public_id}/'
    response = world['api'].patch(url, {'licenses': 1}, format='json')
    assert response.status_code == 422 and 'licenses' in response.json()['errors']
    contract.refresh_from_db()
    assert contract.licenses == 5
    assert not AuditEvent.objects.filter(event=AuditEventType.CONTRACT_UPDATED).exists()
    assert world['api'].patch(url, {'licenses': 2}, format='json').status_code == 200
    get_user_model().objects.create_user(username='excluido', contract=contract, deleted_at=world['admin'].created_at)
    assert world['api'].patch(url, {'licenses': 2}, format='json').status_code == 200


@pytest.mark.parametrize(
    'extra',
    [
        {'licenses': 0},
        {'post_termination_retention_days': 366},
        {'end_date': '2019-12-31'},
        {'plan': '1'},
        {'plan': str(uuid4())},
        {'name': ''},
    ],
)
def test_contract_invalid_fields_return_rfc9457(world, extra):
    response = world['api'].post('/api/v1/admin/contracts/', contract_payload(world, **extra), format='json')
    assert response.status_code == 422, response.content
    assert response['Content-Type'] == 'application/problem+json'
    assert Contract.objects.count() == 1


def test_partial_dates_are_validated_against_locked_current_state(world):
    url = f'/api/v1/admin/contracts/{world["contract"].public_id}/'
    assert world['api'].patch(url, {'end_date': '2019-01-01'}, format='json').status_code == 422


def test_plan_negative_quotas_rejected_and_zero_null_preserved(world):
    api = world['api']
    assert api.post('/api/v1/admin/plans/', {'name': 'P', 'max_storage_bytes': -1}, format='json').status_code == 422
    response = api.post('/api/v1/admin/plans/', {'name': 'P', 'max_organizations': 0}, format='json')
    assert response.status_code == 201
    assert response.json()['max_organizations'] == 0 and response.json()['max_storage_bytes'] is None


def test_deleted_plan_cannot_be_selected_but_historical_contract_remains_editable(world):
    plan = world['plan']
    assert world['api'].delete(f'/api/v1/admin/plans/{plan.public_id}/').status_code == 204
    assert world['api'].post('/api/v1/admin/contracts/', contract_payload(world), format='json').status_code == 422
    url = f'/api/v1/admin/contracts/{world["contract"].public_id}/'
    assert world['api'].patch(url, {'name': 'Histórico'}, format='json').status_code == 200
    assert world['api'].get(url).json()['plan'] == str(plan.public_id)


def test_options_inactive_resolution_and_soft_deleted_exclusion(world):
    plan = world['plan']
    world['api'].patch(f'/api/v1/admin/plans/{plan.public_id}/', {'is_active': False}, format='json')
    url = '/api/v1/admin/plans/options/'
    assert world['api'].get(url).json()['data'] == []
    assert world['api'].get(url, {'public_id': str(plan.public_id)}).json()['data'][0]['value'] == str(plan.public_id)


def test_filters_sorting_pagination_and_schema(world):
    Plan.objects.bulk_create([Plan(name=f'Plano {i:03}') for i in range(105)])
    api = world['api']
    response = api.get('/api/v1/admin/plans/', {'first': 100, 'rows': 20, 'ordering': '-name', 'search': 'Plano'})
    assert response.status_code == 200
    assert len(response.json()['data']) == 6 and response.json()['total_records'] == 106
    assert api.get('/api/v1/admin/plans/', {'rows': 101}).status_code == 422
    assert api.get('/api/v1/admin/plans/', {'ordering': 'created_by__username'}).status_code == 422
    assert api.get('/api/v1/admin/plans/', {'plan': str(world['plan'].public_id)}).status_code == 422
    assert api.get('/api/v1/admin/contracts/', {'plan': str(uuid4())}).json()['total_records'] == 0
    assert api.get('/api/v1/admin/contracts/schema/').json()['filters'][1]['options_url'].endswith('/plans/options/')


@pytest.mark.parametrize('value', ['true', '1', 'yes'])
def test_django_filter_receives_normalized_boolean(world, value):
    Plan.objects.create(name='Desativado', is_active=False)
    response = world['api'].get('/api/v1/admin/plans/', {'is_active': value})
    assert response.status_code == 200
    assert [item['name'] for item in response.json()['data']] == ['Plano']


def test_django_filter_validates_uuid_and_combines_declared_filters(world):
    other = Plan.objects.create(name='Outro')
    Contract.objects.create(name='Outro cliente', plan=other, start_date=date(2020, 1, 1), licenses=5)
    url = '/api/v1/admin/contracts/'
    response = world['api'].get(url, {'plan': str(world['plan'].public_id), 'search': 'Cliente'})
    assert response.status_code == 200 and response.json()['total_records'] == 1
    assert response.json()['data'][0]['public_id'] == str(world['contract'].public_id)
    assert world['api'].get(url, {'plan': 'invalid'}).status_code == 422
    assert world['api'].get(url, {'is_active': 'invalid'}).status_code == 422


def test_offset_does_not_round_to_a_page_boundary(world):
    Plan.objects.bulk_create([Plan(name=f'Page {letter}') for letter in ('A', 'B', 'C', 'D')])
    response = world['api'].get('/api/v1/admin/plans/', {'search': 'Page', 'first': 1, 'rows': 2})
    assert response.json()['total_records'] == 4
    assert [item['name'] for item in response.json()['data']] == ['Page B', 'Page C']
    beyond = world['api'].get('/api/v1/admin/plans/', {'first': 1000})
    assert beyond.status_code == 200 and beyond.json()['data'] == []


def test_list_filters_do_not_change_detail_lookup(world):
    response = world['api'].get(
        f'/api/v1/admin/contracts/{world["contract"].public_id}/', {'search': 'missing', 'ordering': 'invalid'}
    )
    assert response.status_code == 200


def test_organizations_search_is_limited_to_selected_contract(world):
    contract = world['contract']
    own = Organization.objects.create(name='Filial', contract=contract)
    Organization.objects.create(name='Inativa', contract=contract, is_active=False)
    other = Contract.objects.create(name='Outro', plan=world['plan'], start_date=date(2020, 1, 1), licenses=5)
    Organization.objects.create(name='Filial estrangeira', contract=other)
    response = world['api'].get(f'/api/v1/admin/contracts/{contract.public_id}/organizations/')
    assert response.json()['data'] == [{'public_id': str(own.public_id), 'name': 'Filial'}]


def test_jwt_admin_without_context_and_no_access_log(world):
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(world["admin"]).access_token}')
    initial = AccessLog.objects.count()
    assert api.get('/api/v1/admin/contracts/').status_code == 200
    assert AccessLog.objects.count() == initial


@pytest.mark.parametrize('count', [1, 30])
@pytest.mark.parametrize('action', ['', 'options/'])
def test_admin_reads_constant_queries_and_no_incidental_writes(world, count, action):
    Contract.objects.bulk_create(
        [
            Contract(name=f'Cliente {i}', plan=world['plan'], start_date=date(2020, 1, 1), licenses=5)
            for i in range(count - 1)
        ]
    )
    with CaptureQueriesContext(connection) as queries:
        response = world['api'].get(f'/api/v1/admin/contracts/{action}', {'rows': 100})
    assert response.status_code == 200 and len(response.json()['data']) == count
    assert sum(item['sql'].startswith('SELECT') for item in queries) == 2
    assert not any(item['sql'].startswith(('INSERT', 'UPDATE', 'DELETE')) for item in queries)


def test_audit_failure_rolls_back_mutation(world, monkeypatch):
    def fail(*args, **kwargs):
        raise RuntimeError('audit unavailable')

    monkeypatch.setattr(services, 'record', fail)
    response = world['api'].post('/api/v1/admin/plans/', {'name': 'Rollback'}, format='json')
    assert response.status_code == 500
    assert not Plan.objects.filter(name='Rollback').exists()


def test_read_only_fields_cannot_change_public_id_or_author(world):
    contract = world['contract']
    url = f'/api/v1/admin/contracts/{contract.public_id}/'
    response = world['api'].patch(
        url, {'public_id': str(uuid4()), 'created_by': str(world['user'].public_id)}, format='json'
    )
    assert response.status_code == 200
    assert response.json()['public_id'] == str(contract.public_id)


@pytest.mark.django_db(transaction=True)
def test_license_reduction_and_user_creation_share_contract_lock(world):
    contract = world['contract']
    contract.licenses = 2
    contract.save()
    barrier = Barrier(2)

    def mutate(operation):
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            if operation == 'reduce':
                services.save_contract(instance=contract, values={'licenses': 1}, actor=world['admin'])
            else:
                get_user_model().objects.create_user(username='concorrente', contract_id=contract.pk)
            return 'success'
        except ValidationError, LicenseLimitReached:
            return 'blocked'
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(mutate, ('reduce', 'create'))) == ['blocked', 'success']
    contract.refresh_from_db()
    assert get_user_model().objects.filter(contract_id=contract.pk).count() <= contract.licenses
