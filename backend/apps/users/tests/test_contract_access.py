from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contracts.models import Contract

pytestmark = pytest.mark.django_db
PASSWORD = 'test-strong-password-123'
INACTIVE = 'urn:dsync:problem:contract-inactive'
LOGIN, REFRESH, LOGOUT = '/api/v1/auth/login/', '/api/v1/auth/refresh/', '/api/v1/auth/logout/'
ORGANIZATIONS = '/api/v1/me/organizations/'


@pytest.fixture(autouse=True)
def reset_auth_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def maria(user_contract):
    return get_user_model().objects.create_user(username='maria', password=PASSWORD, contract=user_contract)


def make_unavailable(contract, how):
    today = timezone.localdate()
    if how == 'expired':
        Contract.objects.filter(pk=contract.pk).update(end_date=today - timedelta(days=1))
    elif how == 'future':
        Contract.objects.filter(pk=contract.pk).update(start_date=today + timedelta(days=1))
    elif how == 'inactive':
        Contract.objects.filter(pk=contract.pk).update(is_active=False)
    else:
        contract.delete()


def login(client, username='maria', password=PASSWORD):
    return client.post(LOGIN, {'username': username, 'password': password}, format='json')


def assert_contract_inactive(response):
    assert response.status_code == 403
    assert response['Content-Type'] == 'application/problem+json'
    assert response.json()['type'] == INACTIVE


def test_contract_availability_boundaries_are_inclusive(user_contract):
    today = date(2026, 10, 4)
    user_contract.start_date, user_contract.end_date = today, today
    assert user_contract.is_available(today)
    assert not user_contract.is_available(today - timedelta(days=1))
    assert not user_contract.is_available(today + timedelta(days=1))
    user_contract.end_date = None
    assert user_contract.is_available(today + timedelta(days=3650))


@pytest.mark.parametrize('how', ['expired', 'future', 'inactive', 'deleted'])
def test_login_with_right_password_and_unavailable_contract_is_403(how, maria, user_contract):
    make_unavailable(user_contract, how)
    assert_contract_inactive(login(APIClient()))


def test_wrong_password_with_unavailable_contract_stays_401(maria, user_contract):
    make_unavailable(user_contract, 'expired')
    response = login(APIClient(), password='wrong-password')
    assert response.status_code == 401  # Não revela a situação do contrato.


@pytest.mark.parametrize('how', ['expired', 'inactive'])
def test_logged_user_is_denied_on_next_requests_but_can_logout(how, maria, user_contract):
    client = APIClient()
    tokens = login(client).json()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    assert client.get(ORGANIZATIONS).status_code == 200
    make_unavailable(user_contract, how)
    assert_contract_inactive(client.get(ORGANIZATIONS))
    assert_contract_inactive(APIClient().post(REFRESH, {'refresh': tokens['refresh']}, format='json'))
    assert APIClient().post(LOGOUT, {'refresh': tokens['refresh']}, format='json').status_code == 204


def test_reactivated_contract_restores_valid_tokens(maria, user_contract):
    """Decisão 2 da 2.3: negar enquanto indisponível, sem revogar todos os refresh."""
    client = APIClient()
    tokens = login(client).json()
    make_unavailable(user_contract, 'inactive')
    assert_contract_inactive(APIClient().post(REFRESH, {'refresh': tokens['refresh']}, format='json'))
    Contract.objects.filter(pk=user_contract.pk).update(is_active=True)
    assert APIClient().post(REFRESH, {'refresh': tokens['refresh']}, format='json').status_code == 200


def test_superadmin_is_not_affected_by_contracts(user_contract):
    get_user_model().objects.create_superuser(username='root', password=PASSWORD)
    make_unavailable(user_contract, 'inactive')
    client = APIClient()
    tokens = login(client, username='root').json()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    assert client.get(ORGANIZATIONS).status_code == 200
