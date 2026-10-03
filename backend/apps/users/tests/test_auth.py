import logging
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid7

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import close_old_connections, connection, transaction
from django.urls import include, path
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIClient
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from apps.users import services
from apps.users.throttles import LoginThrottle

PASSWORD = 'test-strong-password-123'
LOGIN = '/api/v1/auth/login/'
REFRESH = '/api/v1/auth/refresh/'
LOGOUT = '/api/v1/auth/logout/'


class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'public_id': str(request.user.public_id)})


urlpatterns = [
    path('api/v1/', include('config.api.v1')),
    path('probe/', transaction.non_atomic_requests(ProtectedView.as_view())),
]


@pytest.fixture(autouse=True)
def reset_auth_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username='maria', password=PASSWORD)


@pytest.fixture
def api_client():
    return APIClient()


def login_client(api_client, username='maria', password=PASSWORD):
    response = api_client.post(LOGIN, {'username': username, 'password': password}, format='json')
    assert response.status_code == 200, response.content
    return response


def assert_auth_error(response):
    assert response.status_code == 401
    assert response['Content-Type'] == 'application/problem+json'
    assert response['WWW-Authenticate'].startswith('Bearer')
    assert response.json()['type'] == 'urn:datasync:problem:authentication-required'
    assert response.json()['request_id'] == response['X-Request-Id']


def test_login_uses_public_uuid_and_configured_lifetimes(user, api_client):
    response = login_client(api_client)
    assert set(response.json()) == {'access', 'refresh'}
    access = AccessToken(response.json()['access'])
    refresh = RefreshToken(response.json()['refresh'])
    for token in (access, refresh):
        assert token['public_id'] == str(user.public_id)
        assert 'user_id' not in token
        assert 'id' not in token
        assert not {'username', 'email', 'password'}.intersection(token.payload)
    assert access['exp'] - access['iat'] == 15 * 60
    assert refresh['exp'] - refresh['iat'] == 24 * 60 * 60
    assert 'no-store' in response['Cache-Control']
    assert 'sessionid' not in response.cookies


@pytest.mark.parametrize('kind', ['wrong-password', 'unknown-user', 'inactive', 'deleted'])
def test_invalid_credentials_have_same_generic_error(user, api_client, kind):
    username = user.username
    password = PASSWORD
    if kind == 'wrong-password':
        password = 'wrong-password'
    elif kind == 'unknown-user':
        username = 'unknown'
    elif kind == 'inactive':
        user.is_active = False
        user.save(update_fields=['is_active'])
    else:
        user.delete()
    response = api_client.post(LOGIN, {'username': username, 'password': password}, format='json')
    assert_auth_error(response)
    assert response.json()['detail'] == 'Informe credenciais válidas para acessar este recurso.'
    assert username not in response.json()['detail']


@pytest.mark.django_db
@pytest.mark.parametrize('url', [LOGIN, REFRESH, LOGOUT])
def test_missing_fields_and_malformed_json_follow_error_contract(api_client, url):
    response = api_client.post(url, {}, format='json')
    assert response.status_code == 422
    assert response.json()['type'] == 'urn:datasync:problem:validation-error'
    assert response.json()['errors']
    response = api_client.post(url, data='{', content_type='application/json')
    assert response.status_code == 400
    assert response.json()['type'] == 'urn:datasync:problem:malformed-request'


def test_rotation_blacklists_old_token_and_new_token_works(user, api_client):
    tokens = login_client(api_client).json()
    response = api_client.post(REFRESH, {'refresh': tokens['refresh']}, format='json')
    assert response.status_code == 200
    assert response.json()['refresh'] != tokens['refresh']
    assert 'no-store' in response['Cache-Control']
    assert_auth_error(api_client.post(REFRESH, {'refresh': tokens['refresh']}, format='json'))
    assert api_client.post(REFRESH, {'refresh': response.json()['refresh']}, format='json').status_code == 200


def test_logout_revokes_refresh_without_requiring_valid_access(user, api_client):
    tokens = login_client(api_client).json()
    api_client.credentials(HTTP_AUTHORIZATION='Bearer expired-access')
    response = api_client.post(LOGOUT, {'refresh': tokens['refresh']}, format='json')
    assert response.status_code == 204
    assert response.content == b''
    assert 'no-store' in response['Cache-Control']
    assert_auth_error(api_client.post(REFRESH, {'refresh': tokens['refresh']}, format='json'))


@pytest.mark.parametrize('url', [REFRESH, LOGOUT])
@pytest.mark.parametrize('kind', ['invalid', 'access', 'expired', 'tampered'])
def test_bad_tokens_fail_without_leaking_payload(user, api_client, url, kind):
    tokens = login_client(api_client).json()
    refresh = tokens['refresh']
    if kind == 'invalid':
        refresh = 'private-invalid-token'
    elif kind == 'access':
        refresh = tokens['access']
    elif kind == 'expired':
        from datetime import timedelta

        token = RefreshToken(refresh)
        token.set_exp(lifetime=timedelta(seconds=-1))
        refresh = str(token)
    else:
        parts = refresh.split('.')
        parts[1] = parts[1][::-1]
        refresh = '.'.join(parts)
    response = api_client.post(url, {'refresh': refresh}, format='json')
    assert_auth_error(response)
    assert refresh not in response.content.decode()


@pytest.mark.parametrize('state', ['inactive', 'deleted'])
def test_refresh_and_access_reject_unavailable_user(user, api_client, settings, state):
    settings.ROOT_URLCONF = __name__
    tokens = login_client(api_client).json()
    if state == 'inactive':
        user.is_active = False
        user.save(update_fields=['is_active'])
    else:
        user.delete()
    assert_auth_error(api_client.post(REFRESH, {'refresh': tokens['refresh']}, format='json'))
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    assert_auth_error(api_client.get('/probe/'))


@pytest.mark.django_db(transaction=True)
def test_protected_view_requires_access_and_uses_public_id(user, api_client, settings, django_assert_num_queries):
    settings.ROOT_URLCONF = __name__
    assert_auth_error(api_client.get('/probe/'))
    tokens = login_client(api_client).json()
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    with django_assert_num_queries(1):
        response = api_client.get('/probe/')
    assert response.json() == {'public_id': str(user.public_id)}
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["refresh"]}')
    assert_auth_error(api_client.get('/probe/'))
    api_client.post(LOGOUT, {'refresh': tokens['refresh']}, format='json')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    assert api_client.get('/probe/').status_code == 200  # Access expira em 15 min (ADR 0004).


@pytest.mark.parametrize('claim', [None, 'invalid-uuid', str(uuid7())])
def test_signed_access_with_missing_or_bad_identity_returns_401(user, api_client, settings, claim):
    settings.ROOT_URLCONF = __name__
    token = AccessToken.for_user(user)
    if claim is None:
        del token['public_id']
    else:
        token['public_id'] = claim
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    assert_auth_error(api_client.get('/probe/'))


@pytest.mark.parametrize('url', [REFRESH, LOGOUT])
@pytest.mark.parametrize('claim', [None, 'invalid-uuid'])
def test_signed_refresh_with_missing_or_bad_identity_returns_401(user, api_client, url, claim):
    token = RefreshToken(login_client(api_client).json()['refresh'])
    if claim is None:
        del token['public_id']
    else:
        token['public_id'] = claim
    assert_auth_error(api_client.post(url, {'refresh': str(token)}, format='json'))


def test_tokens_and_credentials_do_not_appear_in_logs(user, api_client, caplog):
    with caplog.at_level(logging.WARNING):
        tokens = login_client(api_client).json()
        api_client.post(LOGIN, {'username': 'private-user', 'password': 'private-password'}, format='json')
        api_client.post(REFRESH, {'refresh': 'private-refresh'}, format='json')
    for private in (*tokens.values(), 'private-user', 'private-password', 'private-refresh'):
        assert private not in caplog.text


def test_failed_login_throttle_follows_account_across_ips_and_returns_retry_after(user, api_client, settings):
    settings.AUTH_LOGIN_RATE = '2/min'
    for address in ('127.0.0.1', '127.0.0.2'):
        response = api_client.post(
            LOGIN, {'username': 'missing', 'password': PASSWORD}, format='json', REMOTE_ADDR=address
        )
        assert_auth_error(response)
    response = api_client.post(
        LOGIN, {'username': 'missing', 'password': PASSWORD}, format='json', REMOTE_ADDR='127.0.0.3'
    )
    assert response.status_code == 429
    assert response['Content-Type'] == 'application/problem+json'
    assert response.json()['type'] == 'about:blank'
    assert int(response['Retry-After']) > 0
    other_address = api_client.post(
        LOGIN, {'username': 'other-account', 'password': PASSWORD}, format='json', REMOTE_ADDR='127.0.0.1'
    )
    assert_auth_error(other_address)


def test_successful_logins_do_not_consume_failure_limit(user, api_client, settings):
    settings.AUTH_LOGIN_RATE = '2/min'
    for _ in range(4):
        login_client(api_client)
    for _ in range(2):
        assert_auth_error(api_client.post(LOGIN, {'username': user.username, 'password': 'wrong'}, format='json'))
    assert api_client.post(LOGIN, {'username': user.username, 'password': PASSWORD}, format='json').status_code == 429


def test_failed_login_limit_recovers_after_the_window(user, api_client, settings, monkeypatch):
    settings.AUTH_LOGIN_RATE = '1/min'
    now = [1000.0]
    monkeypatch.setattr(LoginThrottle, 'timer', lambda _self: now[0])
    assert_auth_error(api_client.post(LOGIN, {'username': user.username, 'password': 'wrong'}, format='json'))
    assert api_client.post(LOGIN, {'username': user.username, 'password': PASSWORD}, format='json').status_code == 429
    now[0] += 61
    login_client(api_client)


def test_validation_errors_do_not_consume_login_failure_limit(user, api_client, settings):
    settings.AUTH_LOGIN_RATE = '1/min'
    for _ in range(2):
        assert api_client.post(LOGIN, {'username': user.username}, format='json').status_code == 422
    login_client(api_client)


def test_equivalent_unicode_username_uses_same_failure_counter(user, api_client, settings):
    settings.AUTH_LOGIN_RATE = '1/min'
    assert_auth_error(api_client.post(LOGIN, {'username': 'ｍａｒｉａ', 'password': 'wrong'}, format='json'))
    assert api_client.post(LOGIN, {'username': user.username, 'password': PASSWORD}, format='json').status_code == 429


def test_password_whitespace_is_preserved(user, api_client):
    password = f' {PASSWORD} '
    user.set_password(password)
    user.save(update_fields=['password'])
    login_client(api_client, password=password)


@pytest.mark.django_db(transaction=True)
def test_concurrent_failures_do_not_lose_the_account_counter(user, api_client, monkeypatch):
    barrier = Barrier(6)

    def deny_login(**_kwargs):
        barrier.wait(timeout=10)
        return None

    def attempt():
        close_old_connections()
        try:
            return APIClient().post(LOGIN, {'username': user.username, 'password': 'wrong'}, format='json').status_code
        finally:
            close_old_connections()

    with monkeypatch.context() as patch:
        patch.setattr(services, 'authenticate', deny_login)
        with ThreadPoolExecutor(max_workers=6) as pool:
            assert list(pool.map(lambda _: attempt(), range(6))) == [401] * 6
    # Pedidos já em processamento terminam; as falhas não se sobrescrevem.
    assert api_client.post(LOGIN, {'username': user.username, 'password': PASSWORD}, format='json').status_code == 429


@pytest.mark.django_db(transaction=True)
def test_concurrent_refresh_consumes_token_only_once():
    if connection.vendor != 'postgresql':
        pytest.skip('Row-lock concurrency requires PostgreSQL')
    user = get_user_model().objects.create_user(username='concurrent', password=PASSWORD)
    client = APIClient()
    raw_token = login_client(client, username=user.username).json()['refresh']
    barrier = Barrier(2)

    def renew():
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            return APIClient().post(REFRESH, {'refresh': raw_token}, format='json').status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(lambda _: renew(), range(2))) == [200, 401]


def test_refresh_service_rolls_back_blacklist_on_failure(user, api_client, monkeypatch):
    raw_token = login_client(api_client).json()['refresh']

    def fail(_self):
        raise RuntimeError('simulated failure')

    with monkeypatch.context() as patch:
        patch.setattr(RefreshToken, 'outstand', fail)
        with pytest.raises(RuntimeError, match='simulated'):
            services.refresh_tokens(refresh=raw_token)
    assert api_client.post(REFRESH, {'refresh': raw_token}, format='json').status_code == 200


def test_refresh_http_failure_rolls_back_and_does_not_log_token(user, api_client, monkeypatch, caplog):
    raw_token = login_client(api_client).json()['refresh']

    def fail(_self):
        raise RuntimeError('private-service-detail')

    with monkeypatch.context() as patch, caplog.at_level(logging.ERROR):
        patch.setattr(RefreshToken, 'outstand', fail)
        response = api_client.post(REFRESH, {'refresh': raw_token}, format='json')
    assert response.status_code == 500
    assert response['Content-Type'] == 'application/problem+json'
    assert raw_token not in caplog.text
    assert 'private-service-detail' not in caplog.text
    assert 'private-service-detail' not in response.content.decode()
    assert api_client.post(REFRESH, {'refresh': raw_token}, format='json').status_code == 200


@pytest.mark.parametrize('quantity', [1, 30])
def test_auth_endpoints_have_constant_query_counts(user, api_client, django_assert_num_queries, quantity):
    get_user_model().objects.bulk_create([get_user_model()(username=f'extra-{i}') for i in range(quantity)])
    with django_assert_num_queries(6):
        tokens = login_client(api_client).json()
    with django_assert_num_queries(19):
        response = api_client.post(REFRESH, {'refresh': tokens['refresh']}, format='json')
        assert response.status_code == 200
    with django_assert_num_queries(13):
        response = api_client.post(LOGOUT, {'refresh': response.json()['refresh']}, format='json')
        assert response.status_code == 204
