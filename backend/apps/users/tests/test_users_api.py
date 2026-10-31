from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from apps.audit.models import AuditEvent, AuditEventType
from apps.contracts.models import Contract, Organization
from apps.rbac.tests.test_permissions import assign, profile_with

pytestmark = pytest.mark.django_db
URL = '/api/v1/users/'
PROBLEM = 'urn:dsync:problem:'
PASSWORD = 'senha-original-segura-123'


@pytest.fixture
def world(user_contract, essential_profile):
    admin = get_user_model().objects.create_superuser(username='root')
    organization = Organization.objects.create(name='Matriz', contract=user_contract)
    manager = get_user_model().objects.create_user(username='gestora', first_name='Gestora', contract=user_contract)
    assign(admin, manager, profile=essential_profile)
    return {'root': admin, 'contract': user_contract, 'org': organization, 'manager': manager}


def client(user, organization):
    api = APIClient()
    api.force_authenticate(user)
    api.credentials(HTTP_X_ORGANIZATION_ID=str(organization.public_id))
    return api


def detail(user):
    return f'{URL}{user.public_id}/'


def test_contract_admin_creates_user_with_one_time_temporary_password(world):
    response = client(world['manager'], world['org']).post(URL, {'username': ' joao ', 'name': ' João '}, format='json')
    assert response.status_code == 201, response.content
    assert 'no-store' in response['Cache-Control']
    data = response.json()
    assert set(data) == {
        'public_id',
        'username',
        'name',
        'is_active',
        'must_change_password',
        'created_at',
        'updated_at',
        'temporary_password',
    }
    user = get_user_model().objects.get(public_id=data['public_id'])
    assert (user.username, user.first_name, user.contract_id) == ('joao', 'João', world['contract'].pk)
    assert user.must_change_password and user.check_password(data['temporary_password'])
    assert user.created_by == world['manager']
    assert 'temporary_password' not in client(world['manager'], world['org']).get(detail(user)).json()
    event = AuditEvent.objects.get(event=AuditEventType.USER_CREATED)
    assert event.target_public_id == user.public_id and data['temporary_password'] not in str(event.changes)


def test_list_shows_only_contract_users_never_superadmins_or_other_contracts(world):
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    get_user_model().objects.create_user(username='alheio', contract=other)
    names = [item['username'] for item in client(world['manager'], world['org']).get(URL).json()['data']]
    assert names == ['gestora']
    foreign = get_user_model().objects.get(username='alheio')
    assert client(world['manager'], world['org']).get(detail(foreign)).status_code == 404


def test_management_is_reserved_to_the_contract_admin(world):
    viewer = profile_with(world['root'], world['contract'], 'Leitor', 'organization:view')
    maria = get_user_model().objects.create_user(username='maria', contract=world['contract'])
    assign(world['root'], maria, profile=viewer)
    api = client(maria, world['org'])
    for method, url in (
        ('get', URL),
        ('post', URL),
        ('patch', detail(world['manager'])),
        ('delete', detail(world['manager'])),
    ):
        response = getattr(api, method)(url, {'name': 'X'}, format='json')
        assert response.status_code == 403, (method, response.content)
        assert response.json()['type'] == PROBLEM + 'permission-denied'
    assert api.post(f'{detail(world["manager"])}reset-password/').status_code == 403


def test_username_unique_across_contracts_including_deleted(world):
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    get_user_model().objects.create_user(username='usado', contract=other)
    removed = get_user_model().objects.create_user(username='removido', contract=world['contract'])
    removed.delete(actor=world['root'])
    api = client(world['manager'], world['org'])
    for username in ('usado', 'removido', 'com espaço'):
        response = api.post(URL, {'username': username, 'name': 'X'}, format='json')
        assert response.status_code == 422 and 'username' in response.json()['errors'], username


def test_license_limit_is_enforced(world):
    Contract.objects.filter(pk=world['contract'].pk).update(licenses=1)
    response = client(world['manager'], world['org']).post(URL, {'username': 'extra', 'name': 'Extra'}, format='json')
    assert response.status_code == 409 and response.json()['type'] == PROBLEM + 'license-limit-reached'


def test_update_deactivate_and_last_admin_protection(world):
    api = client(world['manager'], world['org'])
    joao = get_user_model().objects.create_user(username='joao', first_name='João', contract=world['contract'])
    response = api.patch(detail(joao), {'name': 'João Silva', 'is_active': False}, format='json')
    assert response.status_code == 200, response.content
    joao.refresh_from_db()
    assert (joao.first_name, joao.is_active, joao.updated_by) == ('João Silva', False, world['manager'])

    response = api.patch(detail(world['manager']), {'is_active': False}, format='json')
    assert response.status_code == 409 and response.json()['type'] == PROBLEM + 'last-contract-admin'
    response = api.delete(detail(world['manager']))
    assert response.status_code == 409 and response.json()['type'] == PROBLEM + 'last-contract-admin'


def test_delete_is_soft_and_audited(world):
    joao = get_user_model().objects.create_user(username='joao', contract=world['contract'])
    assert client(world['manager'], world['org']).delete(detail(joao)).status_code == 204
    joao = get_user_model().all_objects.unscoped().get(pk=joao.pk)
    assert joao.deleted_at is not None and joao.deleted_by == world['manager']
    assert AuditEvent.objects.filter(event=AuditEventType.USER_DELETED, target_public_id=joao.public_id).exists()


def test_reset_password_returns_new_temporary_password_and_revokes_sessions(world):
    joao = get_user_model().objects.create_user(username='joao', contract=world['contract'], password=PASSWORD)
    session = APIClient().post('/api/v1/auth/login/', {'username': 'joao', 'password': PASSWORD}, format='json').json()
    response = client(world['manager'], world['org']).post(f'{detail(joao)}reset-password/')
    assert response.status_code == 200, response.content
    assert 'no-store' in response['Cache-Control']
    data = response.json()
    joao.refresh_from_db()
    assert data['user']['must_change_password'] is True and joao.check_password(data['temporary_password'])
    assert not OutstandingToken.objects.filter(user=joao, blacklistedtoken__isnull=True).exists()
    assert APIClient().post('/api/v1/auth/refresh/', {'refresh': session['refresh']}, format='json').status_code == 401


def test_schema_and_options(world):
    api = client(world['manager'], world['org'])
    schema = api.get(f'{URL}schema/').json()
    assert [column['field'] for column in schema['columns']] == [
        'username',
        'first_name',
        'is_active',
        'must_change_password',
    ]
    assert schema['columns'][2]['type'] == 'boolean'
    options = api.get(f'{URL}options/', {'q': 'gest'}).json()
    assert [item['label'] for item in options['data']] == ['gestora']


def test_list_query_count_is_constant(world):
    api = client(world['manager'], world['org'])
    with CaptureQueriesContext(connection) as few:
        response = api.get(URL)
        assert response.status_code == 200, response.content
    for index in range(30):
        get_user_model().objects.create_user(username=f'user{index}', contract=world['contract'])
    with CaptureQueriesContext(connection) as many:
        assert api.get(URL, {'rows': 100}).json()['total_records'] == 31
    assert len(few.captured_queries) == len(many.captured_queries)
    assert not [q for q in many.captured_queries if q['sql'].startswith(('INSERT', 'UPDATE', 'DELETE'))]
