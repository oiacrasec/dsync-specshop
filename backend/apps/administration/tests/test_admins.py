from concurrent.futures import ThreadPoolExecutor
from datetime import date
from importlib import import_module
from threading import Barrier
from uuid import uuid4

import pytest
from django.apps import apps as global_apps
from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.administration import services
from apps.audit.models import AuditEvent, AuditEventType
from apps.contracts.models import Contract, Plan
from apps.rbac.constants import ESSENTIAL_PROFILE_KEY
from apps.rbac.models import Assignment, Profile
from apps.rbac.services import save_assignment

pytestmark = pytest.mark.django_db

LOGIN = '/api/v1/auth/login/'
REFRESH = '/api/v1/auth/refresh/'
PASSWORD = 'senha-original-segura-123'


@pytest.fixture
def world():
    admin = get_user_model().objects.create_superuser(username='admin')
    contract = Contract.objects.create(
        name='Cliente', plan=Plan.objects.create(name='Plano'), start_date=date(2020, 1, 1), licenses=50
    )
    api = APIClient()
    api.force_authenticate(admin)
    return {'admin': admin, 'contract': contract, 'api': api}


def make_admin(world, username, *, contract=None, assignment_active=True, user_active=True):
    contract = contract or world['contract']
    user = get_user_model().objects.create_user(username=username, contract=contract, password=PASSWORD)
    profile = Profile.objects.get(system_key=ESSENTIAL_PROFILE_KEY, contract__isnull=True)
    assignment = Assignment(contract=contract, user=user, profile=profile, scope='CONTRACT')
    save_assignment(assignment=assignment, actor=world['admin'])
    if not assignment_active:
        Assignment.objects.filter(pk=assignment.pk).update(is_active=False)
    if not user_active:
        get_user_model().objects.filter(pk=user.pk).update(is_active=False)
    return user


def admins_url(contract):
    return f'/api/v1/admin/contracts/{contract.public_id}/admins/'


def reset_url(contract, user):
    return f'{admins_url(contract)}{user.public_id}/reset-password/'


def test_list_admins_includes_inactive_users_only_with_active_essential_grant(world):
    contract = world['contract']
    ana = make_admin(world, 'ana')
    bia = make_admin(world, 'bia', user_active=False)
    make_admin(world, 'caio', assignment_active=False)
    get_user_model().objects.create_user(username='comum', contract=contract)
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    make_admin(world, 'outro', contract=other)

    response = world['api'].get(admins_url(contract))
    assert response.status_code == 200, response.content
    assert 'no-store' in response['Cache-Control']
    data = response.json()
    assert data['total_records'] == 2
    assert data['data'] == [
        {
            'public_id': str(ana.public_id),
            'username': 'ana',
            'name': '',
            'is_active': True,
            'must_change_password': False,
        },
        {
            'public_id': str(bia.public_id),
            'username': 'bia',
            'name': '',
            'is_active': False,
            'must_change_password': False,
        },
    ]


def test_list_admins_excludes_deleted_users_and_paginates(world):
    contract = world['contract']
    make_admin(world, 'ana')
    bia = make_admin(world, 'bia')
    make_admin(world, 'caio')
    bia.delete(actor=world['admin'])
    response = world['api'].get(admins_url(contract), {'first': 1, 'rows': 1})
    assert response.status_code == 200, response.content
    assert response.json() == {
        'data': [response.json()['data'][0]],
        'total_records': 2,
    }
    assert response.json()['data'][0]['username'] == 'caio'
    assert world['api'].get(admins_url(contract), {'rows': 101}).status_code == 422


def test_list_admins_query_count_is_constant(world):
    contract = world['contract']
    make_admin(world, 'ana')
    with CaptureQueriesContext(connection) as one:
        assert world['api'].get(admins_url(contract)).status_code == 200
    for index in range(30):
        make_admin(world, f'admin{index}')
    with CaptureQueriesContext(connection) as many:
        assert world['api'].get(admins_url(contract)).status_code == 200
    assert len(one.captured_queries) == len(many.captured_queries)
    assert not [q for q in many.captured_queries if q['sql'].startswith(('INSERT', 'UPDATE', 'DELETE'))]


def test_reset_password_returns_new_password_once_and_forces_change(world):
    contract = world['contract']
    ana = make_admin(world, 'ana')
    response = world['api'].post(reset_url(contract, ana))
    assert response.status_code == 200, response.content
    assert 'no-store' in response['Cache-Control']
    data = response.json()
    assert data['user'] == {
        'public_id': str(ana.public_id),
        'username': 'ana',
        'name': '',
        'is_active': True,
        'must_change_password': True,
    }
    password = data['temporary_password']
    ana.refresh_from_db()
    assert len(password) == 16 and ana.check_password(password) and not ana.check_password(PASSWORD)
    assert ana.must_change_password and ana.updated_by == world['admin']

    event = AuditEvent.objects.get(event=AuditEventType.USER_PASSWORD_RESET)
    assert event.created_by == world['admin'] and event.contract_id == contract.pk
    assert event.target_public_id == ana.public_id
    assert event.changes == {'before': {'must_change_password': False}, 'after': {'must_change_password': True}}
    assert password not in str(event.changes) and ana.password not in str(event.changes)

    login = APIClient().post(LOGIN, {'username': 'ana', 'password': password}, format='json')
    assert login.status_code == 200 and login.json()['user']['must_change_password'] is True


def test_reset_password_revokes_existing_refresh_tokens(world):
    contract = world['contract']
    ana = make_admin(world, 'ana')
    sessions = [APIClient().post(LOGIN, {'username': 'ana', 'password': PASSWORD}, format='json').json() for _ in '12']
    other = make_admin(world, 'bia')
    other_session = APIClient().post(LOGIN, {'username': 'bia', 'password': PASSWORD}, format='json').json()

    assert world['api'].post(reset_url(contract, ana)).status_code == 200
    for session in sessions:
        assert APIClient().post(REFRESH, {'refresh': session['refresh']}, format='json').status_code == 401
    assert not OutstandingToken.objects.filter(user=ana, blacklistedtoken__isnull=True).exists()
    # Outras contas mantêm as sessões; o access antigo da conta resetada é barrado pela flag.
    assert APIClient().post(REFRESH, {'refresh': other_session['refresh']}, format='json').status_code == 200
    assert BlacklistedToken.objects.filter(token__user=other).count() == 1  # só a rotação acima
    blocked = APIClient()
    blocked.credentials(HTTP_AUTHORIZATION=f'Bearer {sessions[0]["access"]}')
    response = blocked.get('/api/v1/me/organizations/')
    assert response.status_code == 403
    assert response.json()['type'] == 'urn:dsync:problem:password-change-required'


def test_reset_inactive_admin_is_allowed(world):
    bia = make_admin(world, 'bia', user_active=False)
    response = world['api'].post(reset_url(world['contract'], bia))
    assert response.status_code == 200, response.content
    assert response.json()['user']['is_active'] is False


@pytest.mark.parametrize('target', ['common', 'inactive_grant', 'other_contract', 'deleted', 'unknown', 'superadmin'])
def test_reset_outside_contract_admins_returns_not_found(world, target):
    contract = world['contract']
    if target == 'common':
        user = get_user_model().objects.create_user(username='comum', contract=contract)
    elif target == 'inactive_grant':
        user = make_admin(world, 'caio', assignment_active=False)
    elif target == 'other_contract':
        other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
        user = make_admin(world, 'outro', contract=other)
    elif target == 'deleted':
        make_admin(world, 'ana')
        user = make_admin(world, 'removido')
        user.delete(actor=world['admin'])
    elif target == 'superadmin':
        user = world['admin']
    else:
        user = get_user_model()(public_id=uuid4())
    response = world['api'].post(reset_url(contract, user))
    assert response.status_code == 404, response.content
    assert not AuditEvent.objects.filter(event=AuditEventType.USER_PASSWORD_RESET).exists()


@pytest.mark.parametrize('method', ['get', 'post'])
def test_admin_routes_require_superadmin(world, method):
    contract = world['contract']
    ana = make_admin(world, 'ana')
    url = admins_url(contract) if method == 'get' else reset_url(contract, ana)
    assert getattr(APIClient(), method)(url).status_code == 401
    common = APIClient()
    common.force_authenticate(ana)
    assert getattr(common, method)(url).status_code == 403
    ana.refresh_from_db()
    assert ana.check_password(PASSWORD) and not ana.must_change_password


def test_reset_failure_rolls_back(world, monkeypatch):
    ana = make_admin(world, 'ana')
    APIClient().post(LOGIN, {'username': 'ana', 'password': PASSWORD}, format='json')

    def broken(*args, **kwargs):
        raise RuntimeError('audit unavailable')

    monkeypatch.setattr('apps.audit.services.record', broken)
    response = world['api'].post(reset_url(world['contract'], ana))
    assert response.status_code == 500
    assert 'temporary_password' not in response.content.decode()
    ana.refresh_from_db()
    assert ana.check_password(PASSWORD) and not ana.must_change_password
    assert not BlacklistedToken.objects.filter(token__user=ana).exists()


def test_service_rechecks_actor(world):
    ana = make_admin(world, 'ana')
    common = get_user_model().objects.create_user(username='comum', contract=world['contract'])
    from django.core.exceptions import PermissionDenied

    with pytest.raises(PermissionDenied):
        services.reset_admin_password(contract=world['contract'], user_public_id=ana.public_id, actor=common)


@pytest.mark.django_db(transaction=True)
def test_concurrent_refresh_and_reset_leave_no_valid_refresh(world):
    migration = import_module('apps.rbac.migrations.0002_essential_contract_admin_profile')
    migration.ensure_essential_profile(global_apps, connection.schema_editor())
    contract = world['contract']
    ana = make_admin(world, 'ana')
    session = APIClient().post(LOGIN, {'username': 'ana', 'password': PASSWORD}, format='json').json()
    barrier = Barrier(2)

    def run(operation):
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            if operation == 'refresh':
                response = APIClient().post(REFRESH, {'refresh': session['refresh']}, format='json')
                return operation, response.status_code, response.json().get('refresh')
            api = APIClient()
            api.force_authenticate(world['admin'])
            return operation, api.post(reset_url(contract, ana)).status_code, None
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = dict((op, (status, token)) for op, status, token in pool.map(run, ('refresh', 'reset')))
    assert results['reset'][0] == 200
    assert results['refresh'][0] in (200, 401)
    # Qualquer que seja a ordem, nenhum refresh da conta continua utilizável.
    assert not OutstandingToken.objects.filter(user=ana, blacklistedtoken__isnull=True).exists()
