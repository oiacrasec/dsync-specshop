from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from uuid import uuid4

import pyotp
import pytest
from cryptography.fernet import Fernet
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import close_old_connections, connection, transaction
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit.models import AccessLog, AccessLogAction, AuditEvent, AuditEventType
from apps.contracts.models import Organization
from apps.core.permission_registry import PermissionScope
from apps.rbac.constants import ESSENTIAL_PROFILE_KEY
from apps.rbac.models import Assignment, Profile
from apps.users.mfa import Mfa
from apps.users.models import UserMfa, UserMfaChallenge, UserRecoveryCode, UserSession

# Sem transação externa do pytest: prova que erros RFC 9457 não apagam as falhas.
pytestmark = pytest.mark.django_db(transaction=True)
PASSWORD = 'test-strong-password-123'


@pytest.fixture(autouse=True)
def mfa_environment(settings):
    settings.MFA_ENCRYPTION_KEY = Fernet.generate_key().decode()
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def account(user_contract):
    return get_user_model().objects.create_user(username='mfa-user', password=PASSWORD, contract=user_contract)


@pytest.fixture
def factor(account):
    secret = pyotp.random_base32()
    return UserMfa.objects.create(user=account, secret=Mfa.encrypt(secret), confirmed=True), secret


def first_step(account):
    response = APIClient().post(
        '/api/v1/auth/login/', {'username': account.username, 'password': PASSWORD}, format='json'
    )
    assert response.status_code == 200, response.content
    assert 'no-store' in response['Cache-Control']
    return response.json()


def second_step(token, code):
    return APIClient().post('/api/v1/auth/login/mfa/', {'mfa_token': token, 'code': code}, format='json')


def authenticated(account):
    api = APIClient()
    api.force_authenticate(account)
    return api


def grant_admin(user):
    # Testes transacionais fazem flush; recria somente a semente da migration.
    profile, _ = Profile.objects.get_or_create(
        system_key=ESSENTIAL_PROFILE_KEY,
        defaults={'name': 'Administrador do contrato'},
    )
    Assignment.objects.create(user=user, contract=user.contract, profile=profile, scope=PermissionScope.CONTRACT)


def assert_sessions_revoked(account, refresh):
    assert not UserSession.objects.filter(user=account).exists()
    assert APIClient().post('/api/v1/auth/refresh/', {'refresh': refresh}, format='json').status_code == 401


def test_mfa_is_optional_until_the_owner_confirms_it(account):
    assert 'access' in first_step(account)
    authenticated(account).post('/api/v1/me/mfa/setup/')
    assert not UserMfa.objects.get(user=account).confirmed
    assert 'access' in first_step(account)


def test_enable_returns_reserves_once_and_revokes_all_existing_sessions(account):
    tokens = [first_step(account), first_step(account)]
    api = authenticated(account)
    setup = api.post('/api/v1/me/mfa/setup/').json()
    response = api.post('/api/v1/me/mfa/enable/', {'code': pyotp.TOTP(setup['secret']).now()}, format='json')
    assert response.status_code == 200, response.content
    codes = response.json()['recovery_codes']
    assert len(codes) == len(set(codes)) == 10
    assert 'no-store' in response['Cache-Control']
    assert UserMfa.objects.get(user=account).confirmed
    for pair in tokens:
        assert_sessions_revoked(account, pair['refresh'])
    status = api.get('/api/v1/me/mfa/').json()
    assert status == {'enabled': True, 'setup_pending': False, 'recovery_codes_remaining': 10}
    assert setup['secret'] not in str(status) and codes[0] not in str(status)
    assert first_step(account)['mfa_required']
    event = AuditEvent.objects.get(event=AuditEventType.USER_MFA_ENABLED)
    assert event.changes == {'before': {'mfa_enabled': False}, 'after': {'mfa_enabled': True}}
    assert codes[0] not in str(event.__dict__) and setup['secret'] not in str(event.__dict__)


def test_enable_requires_unexpired_setup_and_valid_code_and_persists_failures(account):
    api = authenticated(account)
    assert api.post('/api/v1/me/mfa/enable/', {'code': '123456'}, format='json').status_code == 409
    api.post('/api/v1/me/mfa/setup/')
    assert api.post('/api/v1/me/mfa/enable/', {'code': 'wrong'}, format='json').status_code == 422
    device = UserMfa.objects.get(user=account)
    assert device.failures == 1 and not device.confirmed
    assert api.post('/api/v1/me/mfa/enable/', {'code': 'wrong'}, format='json').status_code == 429
    UserMfa.objects.filter(pk=device.pk).update(setup_expires_at=timezone.now() - timedelta(seconds=1))
    assert api.post('/api/v1/me/mfa/enable/', {'code': '123456'}, format='json').status_code == 409


def test_disable_requires_password_and_factor_and_then_login_skips_mfa(account, factor):
    device, _ = factor
    old_generation = device.generation
    with transaction.atomic():
        codes = Mfa(device).new_recovery_codes()
    tokens = second_step(first_step(account)['mfa_token'], codes[0]).json()
    proof = first_step(account)['mfa_token']
    api = authenticated(account)
    wrong = api.post('/api/v1/me/mfa/disable/', {'password': 'wrong', 'code': codes[1]}, format='json')
    assert wrong.status_code == 422
    device.refresh_from_db()
    assert device.confirmed and device.failures == 1
    limited = api.post('/api/v1/me/mfa/disable/', {'password': PASSWORD, 'code': codes[1]}, format='json')
    assert limited.status_code == 429
    UserMfa.objects.filter(pk=device.pk).update(last_failure_at=timezone.now() - timedelta(minutes=2))
    response = api.post('/api/v1/me/mfa/disable/', {'password': PASSWORD, 'code': codes[1]}, format='json')
    assert response.status_code == 204, response.content
    device.refresh_from_db()
    assert not device.confirmed and not device.secret and device.generation != old_generation
    assert not device.recovery_codes.exists() and not UserMfaChallenge.objects.filter(user=account).exists()
    assert second_step(proof, codes[2]).status_code == 401
    assert_sessions_revoked(account, tokens['refresh'])
    assert 'access' in first_step(account)
    assert AuditEvent.objects.filter(event=AuditEventType.USER_MFA_DISABLED).exists()


def test_regenerate_invalidates_old_reserves_proofs_and_sessions(account, factor):
    device, _ = factor
    old_generation = device.generation
    with transaction.atomic():
        codes = Mfa(device).new_recovery_codes()
    tokens = second_step(first_step(account)['mfa_token'], codes[0]).json()
    proof = first_step(account)['mfa_token']
    response = authenticated(account).post('/api/v1/me/mfa/recovery-codes/', {'code': codes[1]}, format='json')
    assert response.status_code == 200, response.content
    new_codes = response.json()['recovery_codes']
    assert len(new_codes) == 10 and not set(codes).intersection(new_codes)
    device.refresh_from_db()
    assert device.confirmed and device.generation != old_generation
    assert not device.recovery_codes.filter(digest=Mfa(device).recovery_digest(codes[2].replace('-', ''))).exists()
    assert second_step(proof, new_codes[0]).status_code == 401
    assert_sessions_revoked(account, tokens['refresh'])
    assert second_step(first_step(account)['mfa_token'], new_codes[0]).status_code == 200
    assert AuditEvent.objects.filter(event=AuditEventType.USER_MFA_RECOVERY_REGENERATED).exists()


def test_contract_admin_reset_is_scoped_and_cannot_reset_other_admins(account, factor, user_contract):
    admin = get_user_model().objects.create_user(username='admin', contract=user_contract)
    grant_admin(admin)
    organization = Organization.objects.create(contract=user_contract, name='Matriz')
    api = authenticated(admin)
    api.credentials(HTTP_X_ORGANIZATION_ID=str(organization.public_id))
    device, secret = factor
    tokens = second_step(first_step(account)['mfa_token'], pyotp.TOTP(secret).now()).json()
    proof = first_step(account)['mfa_token']
    response = api.post(f'/api/v1/users/{account.public_id}/reset-mfa/')
    assert response.status_code == 204, response.content
    device.refresh_from_db()
    assert not device.confirmed and not device.secret
    assert not UserMfaChallenge.objects.filter(user=account).exists()
    assert_sessions_revoked(account, tokens['refresh'])
    assert second_step(proof, '123456').status_code == 401
    event = AuditEvent.objects.get(event=AuditEventType.USER_MFA_RESET)
    assert event.created_by_id == admin.pk and event.contract_id == user_contract.pk
    grant_admin(account)
    assert api.post(f'/api/v1/users/{account.public_id}/reset-mfa/').status_code == 403
    get_user_model().objects.filter(pk=account.pk).update(is_active=False)
    assert api.post(f'/api/v1/users/{account.public_id}/reset-mfa/').status_code == 403
    assert api.post(f'/api/v1/users/{admin.public_id}/reset-mfa/').status_code == 403
    other = get_user_model().objects.create_superuser(username='root', password=PASSWORD)
    assert api.post(f'/api/v1/users/{other.public_id}/reset-mfa/').status_code == 404
    assert authenticated(account).post(f'/api/v1/users/{admin.public_id}/reset-mfa/').status_code == 400


def test_reset_rejects_cross_contract_and_non_admin_even_with_manage_permission(account, factor, user_contract):
    from django.core.exceptions import PermissionDenied

    from apps.users.services import reset_mfa

    other_contract = type(user_contract).objects.create(
        name='Outro cliente',
        start_date=user_contract.start_date,
        licenses=10,
    )
    outsider = get_user_model().objects.create_user(username='outsider', contract=other_contract)
    grant_admin(outsider)
    org = Organization.objects.create(contract=other_contract, name='Outra matriz')
    api = authenticated(outsider)
    api.credentials(HTTP_X_ORGANIZATION_ID=str(org.public_id))
    assert api.post(f'/api/v1/users/{account.public_id}/reset-mfa/').status_code == 404
    with pytest.raises(PermissionDenied):
        reset_mfa(user=account, actor=outsider)
    with pytest.raises(PermissionDenied):
        reset_mfa(user=account, actor=account)
    factor[0].refresh_from_db()
    assert factor[0].confirmed


def test_superadmin_reset_is_only_for_contract_admins_and_cli_for_peers(account, factor, user_contract):
    from io import StringIO

    from django.core.management import call_command

    root = get_user_model().objects.create_superuser(username='root', password=PASSWORD)
    api = authenticated(root)
    url = f'/api/v1/admin/contracts/{user_contract.public_id}/admins/{account.public_id}/reset-mfa/'
    assert api.post(url).status_code == 404
    grant_admin(account)
    get_user_model().objects.filter(pk=account.pk).update(is_active=False)
    assert api.post(url).status_code == 204
    peer = get_user_model().objects.create_superuser(username='peer', password=PASSWORD)
    UserMfa.objects.create(user=peer, secret=Mfa.encrypt(pyotp.random_base32()), confirmed=True)
    assert api.post(f'/api/v1/users/{peer.public_id}/reset-mfa/').status_code == 400
    call_command('reset_mfa', 'peer', actor='root', stdout=StringIO())
    assert not UserMfa.objects.get(user=peer).confirmed
    assert AuditEvent.objects.filter(event=AuditEventType.USER_MFA_RESET, created_by=root).count() == 2


def test_mfa_status_cost_does_not_grow_with_other_accounts(account, user_contract):
    api = authenticated(account)
    with CaptureQueriesContext(connection) as initial:
        assert api.get('/api/v1/me/mfa/').status_code == 200
    for i in range(30):
        owner = get_user_model().objects.create_user(username=f'extra-{i}', contract=user_contract)
        UserMfa.objects.create(user=owner, confirmed=True)
    with CaptureQueriesContext(connection) as larger:
        assert api.get('/api/v1/me/mfa/').status_code == 200
    assert len(initial) == len(larger)


def test_concurrent_regeneration_cannot_reuse_the_same_recovery_code(account, factor):
    device, _ = factor
    with transaction.atomic():
        codes = Mfa(device).new_recovery_codes()
    barrier = Barrier(2)

    def regenerate():
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            return (
                authenticated(account)
                .post(
                    '/api/v1/me/mfa/recovery-codes/',
                    {'code': codes[0]},
                    format='json',
                )
                .status_code
            )
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: regenerate(), range(2)))
    assert results.count(200) == 1 and all(status in (200, 422, 429) for status in results)
    assert UserRecoveryCode.objects.filter(mfa=device).count() == 10
    assert AuditEvent.objects.filter(event=AuditEventType.USER_MFA_RECOVERY_REGENERATED).count() == 1


def test_self_service_mutations_require_authentication():
    for action in ('setup', 'enable', 'disable', 'recovery-codes'):
        assert APIClient().post(f'/api/v1/me/mfa/{action}/', {}, format='json').status_code == 401


@pytest.mark.parametrize('operation', ['setup', 'enable', 'disable', 'recovery-codes', 'login', 'login/mfa', 'reset'])
def test_mfa_operation_query_cost_is_independent_of_other_accounts(operation, user_contract):
    admin = get_user_model().objects.create_user(username='manager', contract=user_contract)
    grant_admin(admin)
    org = Organization.objects.create(contract=user_contract, name='Matriz')

    def measure(suffix):
        owner = get_user_model().objects.create_user(
            username=f'measured-{suffix}', password=PASSWORD, contract=user_contract
        )
        # Mesma condição de sessão a revogar nas duas medições.
        first_step(owner)
        secret = pyotp.random_base32()
        device = UserMfa.objects.create(
            user=owner,
            secret=Mfa.encrypt(secret),
            confirmed=operation not in ('setup', 'enable'),
            setup_expires_at=timezone.now() + timedelta(minutes=5),
        )
        with transaction.atomic():
            reserves = Mfa(device).new_recovery_codes()
        api = authenticated(owner)
        payload = {'code': reserves[0]}
        url = f'/api/v1/me/mfa/{operation}/'
        if operation == 'enable':
            payload = {'code': pyotp.TOTP(secret).now()}
        elif operation == 'disable':
            payload['password'] = PASSWORD
        elif operation == 'login':
            api = APIClient()
            url = '/api/v1/auth/login/'
            payload = {'username': owner.username, 'password': PASSWORD}
        elif operation == 'login/mfa':
            api = APIClient()
            url = '/api/v1/auth/login/mfa/'
            payload['mfa_token'] = first_step(owner)['mfa_token']
        elif operation == 'reset':
            api = authenticated(admin)
            api.credentials(HTTP_X_ORGANIZATION_ID=str(org.public_id))
            url = f'/api/v1/users/{owner.public_id}/reset-mfa/'
        with CaptureQueriesContext(connection) as measured:
            response = api.post(url, payload, format='json')
        assert response.status_code in (200, 204), response.content
        return len(measured)

    before = measure('before')
    for index in range(30):
        owner = get_user_model().objects.create_user(username=f'other-{index}', contract=user_contract)
        UserMfa.objects.create(user=owner, confirmed=True)
    after = measure('after')
    assert before == after, (operation, before, after)


def test_status_and_setup_belong_to_the_owner_and_secret_is_ciphertext(account, user_contract):
    api = authenticated(account)
    assert api.get('/api/v1/me/mfa/').json() == {
        'enabled': False,
        'setup_pending': False,
        'recovery_codes_remaining': 0,
    }
    setup = api.post('/api/v1/me/mfa/setup/').json()
    device = UserMfa.objects.get(user=account)
    assert device.secret != setup['secret'] and setup['secret'] not in device.secret
    assert Mfa.decrypt(device.secret) == setup['secret']
    assert pyotp.parse_uri(setup['otpauth_url']).secret == setup['secret']
    assert not device.confirmed and device.setup_expires_at > timezone.now()
    assert api.get('/api/v1/me/mfa/').json()['setup_pending']
    other = get_user_model().objects.create_user(username='other', contract=user_contract)
    assert not authenticated(other).get('/api/v1/me/mfa/').json()['setup_pending']
    assert APIClient().get('/api/v1/me/mfa/').status_code == 401


def test_missing_or_invalid_key_fails_closed(account, settings):
    for key in ['', 'invalid-key', settings.SECRET_KEY, settings.SIMPLE_JWT['SIGNING_KEY']]:
        settings.MFA_ENCRYPTION_KEY = key
        response = authenticated(account).post('/api/v1/me/mfa/setup/')
        assert response.status_code == 503
        # O handler conserva a política de erros 5xx genéricos, sem detalhes internos.
        assert response.json()['type'] == 'about:blank'
        assert not key or key not in response.content.decode()
        assert not UserMfa.objects.filter(user=account).exists()


def test_password_alone_does_not_open_a_session_or_issue_jwt(account, factor):
    data = first_step(account)
    assert data['mfa_required'] is True and data['expires_in'] == 300
    assert set(data) == {'mfa_required', 'mfa_token', 'expires_in'}
    assert not UserSession.objects.filter(user=account).exists()
    assert not OutstandingToken.objects.filter(user=account).exists()
    assert not AccessLog.objects.filter(action=AccessLogAction.LOGIN_SUCCESS).exists()
    assert data['mfa_token'] not in UserMfaChallenge.objects.get(user=account).digest
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {data["mfa_token"]}')
    assert client.get('/api/v1/me/profile/').status_code == 401
    assert APIClient().post('/api/v1/auth/refresh/', {'refresh': data['mfa_token']}, format='json').status_code == 401


def test_totp_consumes_proof_and_opens_exactly_one_session(account, factor):
    _, secret = factor
    token = first_step(account)['mfa_token']
    response = second_step(token, pyotp.TOTP(secret).now())
    assert response.status_code == 200, response.content
    assert 'no-store' in response['Cache-Control']
    result = response.json()
    assert result['user']['public_id'] == str(account.public_id)
    session = UserSession.objects.get(user=account)
    assert RefreshToken(result['refresh'])['sid'] == str(session.public_id)
    assert not UserMfaChallenge.objects.filter(user=account).exists()
    assert second_step(token, pyotp.TOTP(secret).now()).status_code == 401
    assert AccessLog.objects.filter(action=AccessLogAction.LOGIN_SUCCESS).count() == 1


def test_totp_cannot_be_reused_with_another_proof(account, factor):
    device, secret = factor
    code = pyotp.TOTP(secret).now()
    assert second_step(first_step(account)['mfa_token'], code).status_code == 200
    assert second_step(first_step(account)['mfa_token'], code).status_code == 422
    device.refresh_from_db()
    assert device.failures == 1
    assert UserSession.objects.filter(user=account).count() == 1


def test_failure_counter_persists_and_delay_grows(account, factor):
    device, _ = factor
    token = first_step(account)['mfa_token']
    assert second_step(token, 'incorrect').status_code == 422
    device.refresh_from_db()
    assert device.failures == 1
    limited = second_step(token, 'incorrect')
    assert limited.status_code == 429 and int(limited['Retry-After']) >= 1
    UserMfa.objects.filter(pk=device.pk).update(last_failure_at=timezone.now() - timedelta(seconds=2))
    assert second_step(token, 'incorrect').status_code == 422
    device.refresh_from_db()
    assert device.failures == 2
    assert second_step(token, 'incorrect').status_code == 429
    assert AccessLog.objects.filter(action=AccessLogAction.LOGIN_FAILURE).count() == 2


def test_recovery_codes_are_hashed_and_consumed_once(account, factor):
    device, _ = factor
    with transaction.atomic():
        codes = Mfa(UserMfa.objects.select_for_update().get(pk=device.pk)).new_recovery_codes()
    assert len(codes) == 10 and UserRecoveryCode.objects.filter(mfa=device).count() == 10
    assert set(UserRecoveryCode.objects.filter(mfa=device).values_list('digest', flat=True)).isdisjoint(codes)
    assert second_step(first_step(account)['mfa_token'], codes[0].lower()).status_code == 200
    assert UserRecoveryCode.objects.filter(mfa=device).count() == 9
    assert second_step(first_step(account)['mfa_token'], codes[0]).status_code == 422


def test_expiration_generation_and_password_change_invalidate_proofs(account, factor):
    device, secret = factor
    code = pyotp.TOTP(secret).now()
    token = first_step(account)['mfa_token']
    UserMfaChallenge.objects.filter(user=account).update(expires_at=timezone.now() - timedelta(seconds=1))
    assert second_step(token, code).status_code == 401
    token = first_step(account)['mfa_token']
    UserMfa.objects.filter(pk=device.pk).update(generation=uuid4())
    assert second_step(token, code).status_code == 401
    token = first_step(account)['mfa_token']
    account.set_password('another-strong-password-123')
    account.save(update_fields=['password'])
    assert second_step(token, code).status_code == 401


def test_pending_proofs_are_bounded(account, factor):
    tokens = [first_step(account)['mfa_token'] for _ in range(7)]
    assert UserMfaChallenge.objects.filter(user=account).count() == 5
    assert second_step(tokens[0], 'incorrect').status_code == 401


def test_disabled_account_and_contract_are_revalidated(account, factor):
    _, secret = factor
    token = first_step(account)['mfa_token']
    get_user_model().all_objects.unscoped().filter(pk=account.pk).update(is_active=False)
    assert second_step(token, pyotp.TOTP(secret).now()).status_code == 401
    get_user_model().all_objects.unscoped().filter(pk=account.pk).update(is_active=True)
    account.contract.is_active = False
    account.contract.save()
    assert second_step(token, pyotp.TOTP(secret).now()).status_code == 403


def test_concurrent_confirmation_cannot_create_two_sessions(account, factor):
    _, secret = factor
    token = first_step(account)['mfa_token']
    code = pyotp.TOTP(secret).now()
    barrier = Barrier(2)

    def confirm():
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            return second_step(token, code).status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = sorted(pool.map(lambda _: confirm(), range(2)))
    assert statuses == [200, 401]
    assert UserSession.objects.filter(user=account).count() == 1


def test_setup_cannot_replace_an_active_factor(account, factor):
    device, _ = factor
    original = device.secret
    response = authenticated(account).post('/api/v1/me/mfa/setup/')
    assert response.status_code == 409
    assert response.json()['type'] == 'urn:datasync:problem:mfa-state-conflict'
    device.refresh_from_db()
    assert device.confirmed and device.secret == original


def test_losing_the_encryption_key_never_bypasses_the_factor(account, factor, settings):
    _, secret = factor
    token = first_step(account)['mfa_token']
    settings.MFA_ENCRYPTION_KEY = Fernet.generate_key().decode()
    response = second_step(token, pyotp.TOTP(secret).now())
    assert response.status_code == 503 and response.json()['type'] == 'about:blank'
    assert not UserSession.objects.filter(user=account).exists()
