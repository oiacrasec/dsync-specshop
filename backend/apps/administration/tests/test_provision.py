from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from importlib import import_module
from threading import Barrier

import pytest
from django.apps import apps as global_apps
from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.administration import services
from apps.audit.models import AuditEvent, AuditEventType
from apps.contracts.models import Contract, Organization, Plan
from apps.rbac.constants import ESSENTIAL_PROFILE_KEY
from apps.rbac.models import Assignment

pytestmark = pytest.mark.django_db

PAYLOAD = {'organization_name': 'Matriz', 'username': 'admin.cliente', 'name': 'Maria'}


@pytest.fixture
def world():
    admin = get_user_model().objects.create_superuser(username='admin')
    contract = Contract.objects.create(
        name='Cliente', plan=Plan.objects.create(name='Plano'), start_date=date(2020, 1, 1), licenses=5
    )
    api = APIClient()
    api.force_authenticate(admin)
    return {'admin': admin, 'contract': contract, 'api': api}


def url(contract):
    return f'/api/v1/admin/contracts/{contract.public_id}/provision/'


def test_provision_creates_organization_admin_and_returns_password_once(world):
    contract = world['contract']
    response = world['api'].post(url(contract), PAYLOAD, format='json')
    assert response.status_code == 201, response.content
    assert 'no-store' in response['Cache-Control']
    data = response.json()
    assert set(data) == {'organization', 'user', 'temporary_password'}
    assert data['user'] == {
        'public_id': data['user']['public_id'],
        'username': 'admin.cliente',
        'name': 'Maria',
        'is_superuser': False,
        'must_change_password': True,
    }

    organization = Organization.objects.get(public_id=data['organization']['public_id'])
    assert data['organization'] == {'public_id': str(organization.public_id), 'name': 'Matriz'}
    assert organization.contract_id == contract.pk and organization.created_by == world['admin']

    user = get_user_model().objects.get(public_id=data['user']['public_id'])
    password = data['temporary_password']
    assert len(password) == 16 and user.check_password(password)
    assert user.contract_id == contract.pk and user.must_change_password and not user.is_superuser
    assert user.created_by == world['admin']

    assignment = Assignment.objects.get(user=user)
    assert assignment.profile.system_key == ESSENTIAL_PROFILE_KEY
    assert assignment.scope == 'CONTRACT' and assignment.is_active

    provisioned = AuditEvent.objects.get(event=AuditEventType.CONTRACT_PROVISIONED)
    assert provisioned.created_by == world['admin'] and provisioned.contract_id == contract.pk
    assert provisioned.target_public_id == contract.public_id
    assert provisioned.changes['after'] == {
        'organization': str(organization.public_id),
        'admin_user': str(user.public_id),
        'must_change_password': True,
    }
    assert AuditEvent.objects.filter(event=AuditEventType.ASSIGNMENT_CREATED, target_public_id=assignment.public_id)
    stored = str(list(AuditEvent.objects.values_list('changes', flat=True)))
    assert password not in stored and user.password not in stored


def test_temporary_password_logs_in_with_change_required(world):
    data = world['api'].post(url(world['contract']), PAYLOAD, format='json').json()
    login = APIClient().post(
        '/api/v1/auth/login/', {'username': 'admin.cliente', 'password': data['temporary_password']}, format='json'
    )
    assert login.status_code == 200, login.content
    assert login.json()['user']['must_change_password'] is True


@pytest.mark.parametrize('blocker', ['user', 'inactive_user', 'organization', 'inactive_organization'])
def test_contract_with_users_or_organizations_is_not_provisionable(world, blocker):
    contract = world['contract']
    if blocker in ('user', 'inactive_user'):
        get_user_model().objects.create_user(username='existente', contract=contract, is_active=blocker == 'user')
    else:
        Organization.objects.create(contract=contract, name='Existente', is_active=blocker == 'organization')
    response = world['api'].post(url(contract), PAYLOAD, format='json')
    assert response.status_code == 409, response.content
    assert response.json()['type'] == 'urn:dsync:problem:contract-not-provisionable'
    assert not get_user_model().objects.filter(username='admin.cliente').exists()


def test_deleted_users_and_organizations_do_not_block(world):
    contract = world['contract']
    get_user_model().objects.create_user(username='antigo', contract=contract).delete(actor=world['admin'])
    Organization.objects.create(contract=contract, name='Antiga').delete(actor=world['admin'])
    assert world['api'].post(url(contract), PAYLOAD, format='json').status_code == 201


@pytest.mark.parametrize(
    'change',
    [
        {'is_active': False},
        {'end_date': date(2020, 12, 31)},
        {'start_date': timezone.localdate() + timedelta(days=1)},
    ],
)
def test_unavailable_contract_is_not_provisionable(world, change):
    contract = world['contract']
    Contract.objects.filter(pk=contract.pk).update(**change)
    response = world['api'].post(url(contract), PAYLOAD, format='json')
    assert response.status_code == 409, response.content
    assert response.json()['type'] == 'urn:dsync:problem:contract-not-provisionable'
    assert not Organization.objects.filter(contract=contract).exists()


@pytest.mark.parametrize('deleted', [False, True])
def test_username_in_use_returns_validation_error(world, deleted):
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    existing = get_user_model().objects.create_user(username='admin.cliente', contract=other)
    if deleted:
        existing.delete(actor=world['admin'])
    response = world['api'].post(url(world['contract']), PAYLOAD, format='json')
    assert response.status_code == 422, response.content
    assert 'username' in response.json()['errors']
    assert not Organization.objects.filter(contract=world['contract']).exists()


@pytest.mark.parametrize(
    'payload',
    [
        {},
        {**PAYLOAD, 'username': 'com espaço'},
        {**PAYLOAD, 'organization_name': ''},
        {**PAYLOAD, 'name': 'x' * 151},
    ],
)
def test_invalid_payload_returns_validation_error(world, payload):
    response = world['api'].post(url(world['contract']), payload, format='json')
    assert response.status_code == 422, response.content
    assert response.json()['type'] == 'urn:dsync:problem:validation-error'
    assert 'temporary_password' not in response.content.decode()


def test_requires_active_superadmin(world):
    contract = world['contract']
    assert APIClient().post(url(contract), PAYLOAD, format='json').status_code == 401
    common = APIClient()
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    common.force_authenticate(get_user_model().objects.create_user(username='comum', contract=other))
    assert common.post(url(contract), PAYLOAD, format='json').status_code == 403
    assert not Organization.objects.filter(contract=contract).exists()


def test_unknown_or_deleted_contract_returns_not_found(world):
    contract = world['contract']
    contract.delete(actor=world['admin'])
    assert world['api'].post(url(contract), PAYLOAD, format='json').status_code == 404


def test_failure_after_writes_rolls_back_everything(world, monkeypatch):
    def broken_record(*args, **kwargs):
        raise RuntimeError('audit unavailable')

    monkeypatch.setattr(services, 'record', broken_record)
    response = world['api'].post(url(world['contract']), PAYLOAD, format='json')
    assert response.status_code == 500
    assert 'temporary_password' not in response.content.decode()
    assert not Organization.objects.filter(contract=world['contract']).exists()
    assert not get_user_model().objects.filter(username='admin.cliente').exists()
    assert not Assignment.objects.filter(contract=world['contract']).exists()


def test_provision_query_count_is_bounded(world):
    with CaptureQueriesContext(connection) as queries:
        assert world['api'].post(url(world['contract']), PAYLOAD, format='json').status_code == 201
    writes = [q['sql'] for q in queries.captured_queries if q['sql'].startswith(('INSERT', 'UPDATE', 'DELETE'))]
    # Organização, usuário, atribuição e dois eventos (assignment.created, contract.provisioned).
    assert len(writes) == 5, writes
    # Operação rara e de custo fixo: reutiliza save_user/save_assignment (locks, full_clean, auditoria).
    data = [q for q in queries.captured_queries if not q['sql'].startswith(('SAVEPOINT', 'RELEASE SAVEPOINT'))]
    assert len(data) <= 30, len(data)


@pytest.mark.django_db(transaction=True)
def test_concurrent_provisioning_creates_a_single_admin(world):
    # Testes transacionais esvaziam o banco; a função idempotente da migration recria o perfil essencial.
    migration = import_module('apps.rbac.migrations.0002_essential_contract_admin_profile')
    migration.ensure_essential_profile(global_apps, connection.schema_editor())
    contract = world['contract']
    barrier = Barrier(2)

    def provision(username):
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            api = APIClient()
            api.force_authenticate(world['admin'])
            return api.post(url(contract), {**PAYLOAD, 'username': username}, format='json').status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(provision, ('primeiro', 'segundo'))) == [201, 409]
    assert get_user_model().objects.filter(contract_id=contract.pk).count() == 1
    assert Organization.objects.filter(contract_id=contract.pk).count() == 1
