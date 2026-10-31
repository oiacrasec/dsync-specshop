import logging
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import close_old_connections, connection, transaction
from django.test.utils import CaptureQueriesContext
from django.urls import include, path
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIClient
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import AccessToken

from apps.audit.models import AccessLog, AuditEvent, AuditEventType
from apps.contracts.models import Contract
from apps.users import services

pytestmark = pytest.mark.django_db
PASSWORD = 'temporary-strong-password-123'
NEW_PASSWORD = 'replacement-strong-password-456'
LOGIN = '/api/v1/auth/login/'
CHANGE = '/api/v1/auth/change-password/'
REQUIRED = 'urn:dsync:problem:password-change-required'


class AuthenticatedProbe(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'public_id': str(request.user.public_id)})


class PublicProbe(AuthenticatedProbe):
    permission_classes = [AllowAny]


urlpatterns = [
    path('api/v1/', include('config.api.v1')),
    path('probe/', transaction.non_atomic_requests(AuthenticatedProbe.as_view())),
    path('public-probe/', transaction.non_atomic_requests(PublicProbe.as_view())),
]


@pytest.fixture(autouse=True)
def reset_auth_cache(settings):
    settings.ROOT_URLCONF = __name__
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(user_contract):
    return get_user_model().objects.create_user(
        username='maria', password=PASSWORD, contract=user_contract, first_name='Maria', must_change_password=True
    )


def authenticated_client(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(user)}')
    return client


def change(client, **overrides):
    data = {
        'current_password': PASSWORD,
        'new_password': NEW_PASSWORD,
        'new_password_confirm': NEW_PASSWORD,
        **overrides,
    }
    return client.post(CHANGE, data, format='json')


def assert_problem(response, status, slug):
    assert response.status_code == status, response.content
    assert response['Content-Type'] == 'application/problem+json'
    assert response.json()['type'] == f'urn:dsync:problem:{slug}'
    assert response.json()['request_id'] == response['X-Request-Id']


def test_login_returns_explicit_summary_without_private_fields(user):
    response = APIClient().post(LOGIN, {'username': user.username, 'password': PASSWORD}, format='json')
    assert response.status_code == 200
    assert response.json()['user'] == {
        'public_id': str(user.public_id),
        'username': 'maria',
        'name': 'Maria',
        'is_superuser': False,
        'must_change_password': True,
    }
    assert 'no-store' in response['Cache-Control']
    token = AccessToken(response.json()['access'])
    assert 'must_change_password' not in token  # Estado conferido no banco, não no JWT.


@pytest.mark.parametrize(
    ('method', 'url'),
    [
        ('get', '/probe/'),
        ('get', '/public-probe/'),
        ('get', '/api/v1/me/organizations/'),
        ('get', '/api/v1/admin/contracts/'),
        ('get', '/api/v1/admin/contracts/options/'),
        ('get', '/api/v1/admin/contracts/schema/'),
        ('post', '/api/v1/admin/contracts/'),
    ],
)
@pytest.mark.django_db(transaction=True)
def test_mandatory_change_precedes_view_permissions_context_and_actions(user, method, url):
    client = authenticated_client(user)
    response = getattr(client, method)(url, {'allow_password_change_required': True}, format='json')
    assert_problem(response, 403, 'password-change-required')
    assert AuditEvent.objects.filter(event=AuditEventType.USER_PASSWORD_CHANGED).count() == 0
    assert AccessLog.objects.count() == 0


def test_existing_access_observes_flag_set_after_token_was_issued(user):
    user.must_change_password = False
    user.save(update_fields=['must_change_password'])
    client = authenticated_client(user)
    assert client.get('/probe/').status_code == 200
    user.must_change_password = True
    user.save(update_fields=['must_change_password'])
    assert client.get('/probe/').json()['type'] == REQUIRED


@pytest.mark.django_db(transaction=True)
def test_flagged_user_can_refresh_and_logout_without_changing_password(user):
    client = APIClient()
    tokens = client.post(LOGIN, {'username': user.username, 'password': PASSWORD}, format='json').json()
    response = client.post('/api/v1/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
    assert response.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.json()["access"]}')
    assert client.get('/probe/').json()['type'] == REQUIRED
    assert (
        client.post('/api/v1/auth/logout/', {'refresh': response.json()['refresh']}, format='json').status_code == 204
    )


def test_password_change_unlocks_same_access_and_records_only_safe_state(user):
    client = authenticated_client(user)
    response = change(client)
    assert response.status_code == 200, response.content
    assert response.json()['user']['must_change_password'] is False
    assert 'no-store' in response['Cache-Control']
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD)
    assert not user.check_password(PASSWORD)
    assert user.must_change_password is False
    assert user.updated_by_id == user.pk
    assert client.get('/probe/').status_code == 200
    event = AuditEvent.objects.get(event=AuditEventType.USER_PASSWORD_CHANGED)
    assert event.target_public_id == user.public_id
    assert event.created_by_id == user.pk
    assert event.contract_id == user.contract_id
    assert event.changes == {'before': {'must_change_password': True}, 'after': {'must_change_password': False}}
    assert AccessLog.objects.count() == 0


@pytest.mark.parametrize('mandatory', [False, True])
def test_superadmin_is_exempt_in_summary_and_global_guard(mandatory):
    user = get_user_model().objects.create_superuser(username='root', password=PASSWORD, must_change_password=mandatory)
    response = APIClient().post(LOGIN, {'username': 'root', 'password': PASSWORD}, format='json')
    assert response.json()['user']['is_superuser'] is True
    assert response.json()['user']['must_change_password'] is False
    client = authenticated_client(user)
    assert client.get('/probe/').status_code == 200
    assert client.get('/api/v1/admin/contracts/').status_code == 200


def test_change_requires_valid_access_and_does_not_accept_identity_from_payload(user, user_contract):
    assert_problem(change(APIClient()), 401, 'authentication-required')
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION='Bearer invalid')
    assert_problem(change(client), 401, 'authentication-required')
    other_contract = Contract.objects.create(name='Outro contrato', start_date=user_contract.start_date, licenses=10)
    other = get_user_model().objects.create_user(username='other', password=PASSWORD, contract=other_contract)
    response = change(
        authenticated_client(user), public_id=str(other.public_id), contract=str(other_contract.public_id)
    )
    assert response.status_code == 200
    other.refresh_from_db()
    assert other.check_password(PASSWORD)
    assert not other.check_password(NEW_PASSWORD)


@pytest.mark.parametrize(
    ('overrides', 'field'),
    [
        ({'current_password': 'wrong-current-password'}, 'current_password'),
        ({'new_password_confirm': 'mismatch'}, 'new_password_confirm'),
        ({'new_password': PASSWORD, 'new_password_confirm': PASSWORD}, 'new_password'),
        ({'new_password': 'short', 'new_password_confirm': 'short'}, 'new_password'),
        ({'new_password': '12345678901234567890', 'new_password_confirm': '12345678901234567890'}, 'new_password'),
        ({'new_password': 'password', 'new_password_confirm': 'password'}, 'new_password'),
        ({'new_password': 'maria', 'new_password_confirm': 'maria'}, 'new_password'),
        ({'current_password': ''}, 'current_password'),
    ],
)
def test_rejected_passwords_preserve_hash_flag_and_audit(user, overrides, field):
    original_hash = user.password
    response = change(authenticated_client(user), **overrides)
    assert_problem(response, 422, 'validation-error')
    assert field in response.json()['errors']
    assert 'no-store' in response['Cache-Control']
    user.refresh_from_db()
    assert user.password == original_hash
    assert user.must_change_password is True
    assert not AuditEvent.objects.filter(event=AuditEventType.USER_PASSWORD_CHANGED).exists()


@pytest.mark.parametrize('state', ['inactive', 'deleted', 'contract-inactive'])
def test_account_and_contract_are_rechecked_before_change(user, state):
    client = authenticated_client(user)
    if state == 'inactive':
        user.is_active = False
        user.save(update_fields=['is_active'])
    elif state == 'deleted':
        user.delete()
    else:
        Contract.objects.filter(pk=user.contract_id).update(is_active=False)
    response = change(client)
    assert_problem(
        response,
        403 if state == 'contract-inactive' else 401,
        'contract-inactive' if state == 'contract-inactive' else 'authentication-required',
    )


def test_password_change_can_also_be_requested_without_mandatory_flag(user):
    user.must_change_password = False
    user.save(update_fields=['must_change_password'])
    assert change(authenticated_client(user)).status_code == 200


def test_new_accounts_default_to_no_mandatory_change(user_contract):
    user = get_user_model().objects.create_user(username='existing-policy', contract=user_contract)
    assert user.must_change_password is False


def test_change_rejects_missing_fields_and_malformed_json(user):
    client = authenticated_client(user)
    response = client.post(CHANGE, {}, format='json')
    assert_problem(response, 422, 'validation-error')
    assert set(response.json()['errors']) == {'current_password', 'new_password', 'new_password_confirm'}
    assert_problem(client.post(CHANGE, data='{', content_type='application/json'), 400, 'malformed-request')


def test_superadmin_can_change_own_password_voluntarily_without_tenant():
    user = get_user_model().objects.create_superuser(username='root', password=PASSWORD)
    response = change(authenticated_client(user))
    assert response.status_code == 200
    event = AuditEvent.objects.get(event=AuditEventType.USER_PASSWORD_CHANGED)
    assert event.contract_id is None
    assert event.created_by_id == user.pk


@pytest.mark.parametrize('state', ['inactive', 'deleted'])
def test_service_rechecks_account_instead_of_trusting_stale_authenticated_instance(user, state):
    from rest_framework.exceptions import AuthenticationFailed

    if state == 'inactive':
        get_user_model().objects.filter(pk=user.pk).update(is_active=False)
    else:
        get_user_model().objects.filter(pk=user.pk).delete()
    with pytest.raises(AuthenticationFailed):
        services.change_password(user=user, current_password=PASSWORD, new_password=NEW_PASSWORD)


def test_password_whitespace_is_preserved_and_argon2_is_used(user, settings):
    settings.PASSWORD_HASHERS = ['django.contrib.auth.hashers.Argon2PasswordHasher']
    password = f' {PASSWORD} '
    user.set_password(password)
    user.save(update_fields=['password'])
    replacement = f' {NEW_PASSWORD} '
    response = change(
        authenticated_client(user),
        current_password=password,
        new_password=replacement,
        new_password_confirm=replacement,
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.password.startswith('argon2$')
    assert user.check_password(replacement)
    assert not user.check_password(NEW_PASSWORD)


def test_passwords_never_appear_in_responses_logs_or_audit(user, caplog):
    client = authenticated_client(user)
    with caplog.at_level(logging.WARNING):
        failure = change(client, current_password='private-invalid-password')
        success = change(client)
    assert success.status_code == 200
    for value in (PASSWORD, NEW_PASSWORD, 'private-invalid-password'):
        assert value not in caplog.text
        assert value not in failure.content.decode()
        assert value not in success.content.decode()
        assert value not in str(list(AuditEvent.objects.values('changes')))


def test_audit_failure_rolls_back_password_and_flag(user, monkeypatch, caplog):
    def fail(*args, **kwargs):
        raise RuntimeError('private-password-change-detail')

    monkeypatch.setattr('apps.audit.services.record', fail)
    original_hash = user.password
    with caplog.at_level(logging.ERROR):
        response = change(authenticated_client(user))
    assert response.status_code == 500
    assert response['Content-Type'] == 'application/problem+json'
    assert 'private-password-change-detail' not in caplog.text
    assert 'private-password-change-detail' not in response.content.decode()
    user.refresh_from_db()
    assert user.password == original_hash
    assert user.must_change_password is True


def test_change_throttle_limits_expensive_attempts_per_user_before_hash(user, monkeypatch):
    client = authenticated_client(user)
    for _ in range(5):
        assert change(client, current_password='wrong').status_code == 422

    def fail(**kwargs):
        pytest.fail('O limite deve ocorrer antes de validar/hash/lock.')

    monkeypatch.setattr(services, 'change_password', fail)
    response = change(client)
    assert response.status_code == 429
    assert int(response['Retry-After']) > 0
    assert 'no-store' in response['Cache-Control']
    assert client.get('/probe/').json()['type'] == REQUIRED  # Não altera o limite de navegação.


@pytest.mark.django_db(transaction=True)
def test_concurrent_changes_cannot_reuse_the_same_current_password(user):
    assert connection.vendor == 'postgresql'
    barrier = Barrier(2)

    def attempt(index):
        close_old_connections()
        try:
            client = authenticated_client(user)
            barrier.wait(timeout=10)
            replacement = f'{NEW_PASSWORD}-{index}'
            return change(client, new_password=replacement, new_password_confirm=replacement).status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(attempt, range(2))) == [200, 422]
    assert AuditEvent.objects.filter(event=AuditEventType.USER_PASSWORD_CHANGED).count() == 1


@pytest.mark.parametrize('quantity', [1, 30])
@pytest.mark.django_db(transaction=True)
def test_global_guard_has_one_query_no_writes_or_locks_for_blocked_and_normal_reads(user, quantity):
    get_user_model().objects.bulk_create(
        [get_user_model()(username=f'extra-{i}', contract=user.contract) for i in range(quantity)]
    )
    client = authenticated_client(user)
    for mandatory in (True, False):
        user.must_change_password = mandatory
        user.save(update_fields=['must_change_password'])
        with CaptureQueriesContext(connection) as queries:
            response = client.get('/probe/')
        assert response.status_code == (403 if mandatory else 200)
        assert len(queries) == 1
        assert queries[0]['sql'].startswith('SELECT')
        assert 'FOR UPDATE' not in queries[0]['sql']


@pytest.mark.parametrize('quantity', [1, 30])
def test_change_queries_lock_only_current_user_and_have_bounded_writes(user, quantity):
    get_user_model().objects.bulk_create(
        [get_user_model()(username=f'extra-{i}', contract=user.contract) for i in range(quantity)]
    )
    with CaptureQueriesContext(connection) as queries:
        response = change(authenticated_client(user))
    assert response.status_code == 200
    statements = [item['sql'] for item in queries if item['sql'].startswith(('SELECT', 'INSERT', 'UPDATE', 'DELETE'))]
    assert len(statements) == 4  # JWT, conta sob lock, UPDATE, INSERT de auditoria.
    locks = [sql for sql in statements if 'FOR UPDATE' in sql]
    assert len(locks) == 1
    assert 'FOR UPDATE OF "dsc_user"' in locks[0]
    assert sum(sql.startswith('UPDATE') for sql in statements) == 1
    assert sum(sql.startswith('INSERT') for sql in statements) == 1
