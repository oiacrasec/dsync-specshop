from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users import services
from apps.users.devices import UserAgent
from apps.users.models import UserSession

pytestmark = pytest.mark.django_db
PASSWORD = 'test-strong-password-123'
CHROME_WINDOWS = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
)
SAFARI_IPHONE = (
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) '
    'Version/18.0 Mobile/15E148 Safari/604.1'
)


@pytest.fixture(autouse=True)
def clean_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def maria(user_contract):
    return get_user_model().objects.create_user(username='maria', password=PASSWORD, contract=user_contract)


def login(agent=CHROME_WINDOWS, ip='10.0.0.1'):
    response = APIClient().post(
        '/api/v1/auth/login/',
        {'username': 'maria', 'password': PASSWORD},
        format='json',
        HTTP_USER_AGENT=agent,
        REMOTE_ADDR=ip,
    )
    assert response.status_code == 200, response.content
    tokens = response.json()
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    return api, tokens


def refresh(token):
    return APIClient().post('/api/v1/auth/refresh/', {'refresh': token}, format='json')


@pytest.mark.parametrize(
    ('header', 'label'),
    [
        (CHROME_WINDOWS, 'Chrome no Windows'),
        (SAFARI_IPHONE, 'Safari no iOS'),
        ('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0', 'Firefox no Linux'),
        (CHROME_WINDOWS + ' Edg/141.0.0.0', 'Edge no Windows'),
        ('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36', 'Chrome no Android'),
        ('', 'Outro navegador no outro sistema'),
        ('curl/8.0', 'Outro navegador no outro sistema'),
    ],
)
def test_user_agent_labels(header, label):
    assert UserAgent(header).label == label


def test_login_opens_a_session_that_follows_token_rotation(maria):
    api, tokens = login()
    session = UserSession.objects.get(user=maria)
    assert session.device == 'Chrome no Windows' and session.ip == '10.0.0.1'
    assert RefreshToken(tokens['refresh'])['sid'] == str(session.public_id)
    rotated = refresh(tokens['refresh']).json()
    assert RefreshToken(rotated['refresh'])['sid'] == str(session.public_id)
    session.refresh_from_db()
    assert session.refresh_jti == RefreshToken(rotated['refresh'])['jti']
    assert UserSession.objects.filter(user=maria).count() == 1


def test_list_marks_the_current_session(maria):
    login(agent=SAFARI_IPHONE)
    api, _ = login()
    data = api.get('/api/v1/me/sessions/').json()
    assert [(item['device'], item['current']) for item in data] == [
        ('Chrome no Windows', True),
        ('Safari no iOS', False),
    ]
    assert set(data[0]) == {'public_id', 'device', 'ip', 'created_at', 'last_seen_at', 'current'}


def test_ending_a_session_blocks_its_next_refresh(maria):
    _, phone = login(agent=SAFARI_IPHONE)
    api, _ = login()
    phone_session = UserSession.objects.get(device='Safari no iOS')
    assert api.delete(f'/api/v1/me/sessions/{phone_session.public_id}/').status_code == 204
    assert refresh(phone['refresh']).status_code == 401
    assert not UserSession.objects.filter(pk=phone_session.pk).exists()


def test_end_others_keeps_only_the_current_session(maria):
    _, first = login(agent=SAFARI_IPHONE)
    _, second = login(agent='Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0')
    api, current = login()
    assert api.post('/api/v1/me/sessions/end-others/').json() == {'ended': 2}
    assert refresh(first['refresh']).status_code == 401 and refresh(second['refresh']).status_code == 401
    assert refresh(current['refresh']).status_code == 200


def test_cannot_end_a_session_of_another_account(maria, user_contract):
    get_user_model().objects.create_user(username='joao', password=PASSWORD, contract=user_contract)
    joao = APIClient().post('/api/v1/auth/login/', {'username': 'joao', 'password': PASSWORD}, format='json').json()
    api, _ = login()
    other = UserSession.objects.get(user__username='joao')
    assert api.delete(f'/api/v1/me/sessions/{other.public_id}/').status_code == 404
    assert refresh(joao['refresh']).status_code == 200


def test_logout_and_password_reset_remove_sessions(maria):
    _, tokens = login()
    assert APIClient().post('/api/v1/auth/logout/', {'refresh': tokens['refresh']}, format='json').status_code == 204
    assert not UserSession.objects.filter(user=maria).exists()
    login()
    login(agent=SAFARI_IPHONE)
    root = get_user_model().objects.create_superuser(username='root')
    services.reset_password(user=maria, actor=root)
    assert not UserSession.objects.filter(user=maria).exists()


def test_expired_sessions_are_purged_on_login_and_hidden_from_the_list(maria):
    login(agent=SAFARI_IPHONE)
    UserSession.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    api, _ = login()
    assert [item['device'] for item in api.get('/api/v1/me/sessions/').json()] == ['Chrome no Windows']
    assert UserSession.objects.filter(user=maria).count() == 1


def test_tokens_issued_before_sessions_get_one_on_refresh(maria):
    legacy = RefreshToken.for_user(maria)
    response = refresh(str(legacy))
    assert response.status_code == 200
    assert UserSession.objects.filter(user=maria).count() == 1
    assert 'sid' in RefreshToken(response.json()['refresh'])


def test_login_history_shows_only_this_accounts_successful_logins(maria, user_contract):
    login(ip='10.0.0.7')
    api, _ = login(ip='10.0.0.8')
    APIClient().post('/api/v1/auth/login/', {'username': 'maria', 'password': 'errada'}, format='json')
    get_user_model().objects.create_user(username='joao', password=PASSWORD, contract=user_contract)
    APIClient().post('/api/v1/auth/login/', {'username': 'joao', 'password': PASSWORD}, format='json')
    data = api.get('/api/v1/me/logins/').json()
    assert [item['ip'] for item in data] == ['10.0.0.8', '10.0.0.7']
    assert set(data[0]) == {'occurred_at', 'ip'}
