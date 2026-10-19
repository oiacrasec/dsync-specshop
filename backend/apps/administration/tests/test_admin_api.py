from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier
from types import SimpleNamespace
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.db import close_old_connections, connection
from django.test.utils import CaptureQueriesContext
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError as SerializerValidationError
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.administration.serializers import ContractSerializer, PlanSerializer
from apps.audit import services as audit_services
from apps.audit.models import AccessLog, AuditEvent, AuditEventType
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


@pytest.mark.parametrize('explicit_null', [False, True])
def test_create_contract_without_plan_is_audited_and_readable(world, explicit_null):
    payload = contract_payload(world)
    if explicit_null:
        payload['plan'] = None
    else:
        payload.pop('plan')
    response = world['api'].post('/api/v1/admin/contracts/', payload, format='json')
    assert response.status_code == 201, response.content
    assert response.json()['plan'] is None
    public_id = response.json()['public_id']
    contract = Contract.objects.get(public_id=public_id)
    assert contract.plan_id is None and contract.created_by == world['admin']
    event = AuditEvent.objects.get(event=AuditEventType.CONTRACT_CREATED, target_public_id=public_id)
    assert event.changes['after']['plan'] is None
    assert world['api'].get(f'/api/v1/admin/contracts/{public_id}/').json()['plan'] is None
    assert any(
        row['public_id'] == public_id and row['plan'] is None
        for row in world['api'].get('/api/v1/admin/contracts/').json()['data']
    )


def test_partial_update_can_remove_plan_without_weakening_license_rules(world):
    contract = world['contract']
    get_user_model().objects.create_user(username='inactive-without-plan', contract=contract, is_active=False)
    url = f'/api/v1/admin/contracts/{contract.public_id}/'
    assert world['api'].patch(url, {'plan': None, 'licenses': 1}, format='json').status_code == 422
    contract.refresh_from_db()
    assert contract.plan_id == world['plan'].pk
    response = world['api'].patch(url, {'plan': None}, format='json')
    assert response.status_code == 200 and response.json()['plan'] is None
    event = AuditEvent.objects.get(event=AuditEventType.CONTRACT_UPDATED, target_public_id=contract.public_id)
    assert event.changes['before']['plan'] == str(world['plan'].public_id)
    assert event.changes['after']['plan'] is None
    assert world['api'].patch(url, {'name': 'Ainda sem plano'}, format='json').status_code == 200


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


def test_schema_ordering_matches_filterset_and_column_labels(world):
    data = world['api'].get('/api/v1/admin/contracts/schema/').json()
    assert data['ordering_fields'] == ['name', 'created_at', 'updated_at', 'start_date', 'end_date', 'licenses']
    assert data['columns'][1] == {'field': 'start_date', 'label': 'Início', 'type': 'date'}
    assert data['general_search'] == {
        'parameter': 'search',
        'label': 'Busca geral',
        'fields': [{'field': 'name', 'label': 'Nome', 'lookup': 'icontains'}],
    }


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


@pytest.mark.parametrize('path', ['organizations/', 'organizations/options/', 'organizations/schema/'])
def test_admin_area_has_no_organization_routes(world, path):
    # ADR 0037: organizações só na área do cliente; suporte do superadmin fica para depois.
    assert world['api'].get(f'/api/v1/admin/{path}').status_code == 404


def test_jwt_admin_without_context_and_no_access_log(world):
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(world["admin"]).access_token}')
    initial = AccessLog.objects.count()
    assert api.get('/api/v1/admin/contracts/').status_code == 200
    assert AccessLog.objects.count() == initial


@pytest.mark.parametrize('count', [1, 30])
@pytest.mark.parametrize('action', ['', 'options/'])
@pytest.mark.parametrize('with_plan', [False, True])
def test_admin_reads_constant_queries_and_no_incidental_writes(world, count, action, with_plan):
    plan = world['plan'] if with_plan else None
    if not with_plan:
        Contract.objects.filter(pk=world['contract'].pk).update(plan=None)
    Contract.objects.bulk_create(
        [Contract(name=f'Cliente {i}', plan=plan, start_date=date(2020, 1, 1), licenses=5) for i in range(count - 1)]
    )
    with CaptureQueriesContext(connection) as queries:
        response = world['api'].get(f'/api/v1/admin/contracts/{action}', {'rows': 100})
    assert response.status_code == 200 and len(response.json()['data']) == count
    assert sum(item['sql'].startswith('SELECT') for item in queries) == 2
    assert not any(item['sql'].startswith(('INSERT', 'UPDATE', 'DELETE')) for item in queries)


def test_audit_failure_rolls_back_mutation(world, monkeypatch):
    def fail(*args, **kwargs):
        raise RuntimeError('audit unavailable')

    monkeypatch.setattr(audit_services, 'record', fail)
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


def test_serializer_without_view_preserves_validation_autorship_and_audit(world):
    context = {'request': SimpleNamespace(user=world['admin'])}
    serializer = ContractSerializer(data=contract_payload(world), context=context)
    serializer.is_valid(raise_exception=True)
    created = serializer.save()
    assert created.created_by == world['admin']
    assert AuditEvent.objects.filter(event=AuditEventType.CONTRACT_CREATED, target_public_id=created.public_id).exists()

    contract = world['contract']
    get_user_model().objects.create_user(username='inativo-direto', contract=contract, is_active=False)
    serializer = ContractSerializer(instance=contract, data={'licenses': 1}, partial=True, context=context)
    with pytest.raises(SerializerValidationError):
        serializer.is_valid(raise_exception=True)
    contract.refresh_from_db()
    assert contract.licenses == 5


def test_serializer_without_view_preserves_authorization(world):
    serializer = ContractSerializer(
        data=contract_payload(world), context={'request': SimpleNamespace(user=world['user'])}
    )
    with pytest.raises(PermissionDenied):
        serializer.is_valid(raise_exception=True)


@pytest.mark.django_db(transaction=True)
def test_serializer_requires_validation_inside_transaction(world):
    serializer = PlanSerializer(data={'name': 'Plano'}, context={'request': SimpleNamespace(user=world['admin'])})
    with pytest.raises(ImproperlyConfigured, match='same transaction'):
        serializer.is_valid(raise_exception=True)


def test_partial_update_validates_dates_against_fresh_instance(world):
    contract = world['contract']
    Contract.objects.filter(pk=contract.pk).update(start_date=date(2025, 1, 1))
    serializer = ContractSerializer(
        instance=contract,
        data={'end_date': '2024-12-31'},
        partial=True,
        context={'request': SimpleNamespace(user=world['admin'])},
    )
    assert not serializer.is_valid()
    assert 'end_date' in serializer.errors


@pytest.mark.parametrize('action', ['create', 'update'])
def test_serializer_extra_hooks_run_before_save_and_are_audited(world, action):
    class CustomPlanSerializer(PlanSerializer):
        def create_extra(self, validated_data):
            assert connection.in_atomic_block
            validated_data['is_active'] = False

        def update_extra(self, instance, validated_data):
            assert connection.in_atomic_block
            assert Plan.objects.get(pk=instance.pk).is_active
            validated_data['is_active'] = False

    serializer = CustomPlanSerializer(
        instance=world['plan'] if action == 'update' else None,
        data={'name': 'Plano ajustado'},
        partial=action == 'update',
        context={'request': SimpleNamespace(user=world['admin'])},
    )
    serializer.is_valid(raise_exception=True)
    saved = serializer.save()
    saved.refresh_from_db()
    assert not saved.is_active
    event = AuditEvent.objects.get(event=serializer.audit_events[action], target_public_id=saved.public_id)
    assert event.changes['after']['is_active'] is False
    assert event.changes['before'] is None if action == 'create' else event.changes['before']['is_active'] is True


def test_update_rolls_back_fields_and_author_when_audit_fails(world, monkeypatch):
    def fail(*args, **kwargs):
        raise RuntimeError('audit unavailable')

    monkeypatch.setattr(audit_services, 'record', fail)
    plan = world['plan']
    before = AuditEvent.objects.count()
    serializer = PlanSerializer(
        instance=plan,
        data={'is_active': False},
        partial=True,
        context={'request': SimpleNamespace(user=world['admin'])},
    )
    serializer.is_valid(raise_exception=True)
    with pytest.raises(RuntimeError, match='audit unavailable'):
        serializer.save()
    plan.refresh_from_db()
    assert plan.is_active and plan.updated_by_id is None
    assert AuditEvent.objects.count() == before


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
                api = APIClient()
                api.force_authenticate(world['admin'])
                response = api.patch(f'/api/v1/admin/contracts/{contract.public_id}/', {'licenses': 1}, format='json')
                assert response.status_code in (200, 422), response.content
                return 'success' if response.status_code == 200 else 'blocked'
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


@pytest.mark.parametrize('key,serializer_class', [('plan', PlanSerializer), ('contract', ContractSerializer)])
def test_serializer_deletion_requires_superadmin_without_view(world, key, serializer_class):
    with pytest.raises(PermissionDenied):
        serializer_class(instance=world[key], context={'request': SimpleNamespace(user=world['user'])}).delete()
    assert type(world[key]).objects.filter(pk=world[key].pk).exists()


@pytest.mark.parametrize('key,serializer_class', [('plan', PlanSerializer), ('contract', ContractSerializer)])
def test_serializer_deletion_rolls_back_when_audit_fails(world, monkeypatch, key, serializer_class):
    def fail(*args, **kwargs):
        raise RuntimeError('audit unavailable')

    monkeypatch.setattr(audit_services, 'record', fail)
    before = AuditEvent.objects.count()
    with pytest.raises(RuntimeError, match='audit unavailable'):
        serializer_class(instance=world[key], context={'request': SimpleNamespace(user=world['admin'])}).delete()
    current = type(world[key]).objects.get(pk=world[key].pk)
    assert current.deleted_at is None and current.deleted_by_id is None
    assert AuditEvent.objects.count() == before
