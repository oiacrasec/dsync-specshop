"""Registro de autenticação seletivo (ADR 0019), sem escrita na navegação comum."""

from datetime import date
from uuid import UUID

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import include, path
from rest_framework.response import Response
from rest_framework.test import APIClient
from rest_framework.views import APIView

from apps.audit.checks import check_access_log_proxy_headers
from apps.audit.models import AccessLog, AccessLogAction
from apps.contracts.models import Contract, Organization, Plan
from apps.core import permission_registry
from apps.core.permission_registry import PermissionDefinition, PermissionRegistry, PermissionScope
from apps.rbac import services
from apps.rbac.models import Assignment

pytestmark = [pytest.mark.django_db, pytest.mark.urls(__name__)]
PASSWORD = 'test-strong-password-123'


class RecordView(APIView):
    required_permission = 'record:view'

    def get(self, request):
        return Response({})


class BrokenView(APIView):
    required_permission = 'record:view'

    def get(self, request):
        raise RuntimeError('falha interna')


urlpatterns = [
    path('api/v1/', include('config.api.v1')),
    path('api/v1/record/', RecordView.as_view()),
    path('api/v1/broken/', BrokenView.as_view()),
]


@pytest.fixture(autouse=True)
def business_registry(monkeypatch):
    registry = PermissionRegistry(
        [PermissionDefinition('record:view', frozenset(PermissionScope)), *list(permission_registry.PERMISSIONS)]
    )
    monkeypatch.setattr(permission_registry, 'PERMISSIONS', registry)
    monkeypatch.setattr(services, 'PERMISSIONS', registry)
    cache.clear()


@pytest.fixture
def world():
    contract = Contract.objects.create(
        name='A', plan=Plan.objects.create(name='P'), start_date=date(2020, 1, 1), licenses=5
    )
    organization = Organization.objects.create(name='obras', contract=contract)
    admin = get_user_model().objects.create_superuser(username='admin', password=PASSWORD)
    maria = get_user_model().objects.create_user(username='maria', password=PASSWORD, contract=contract)
    assignment = Assignment(contract=contract, user=maria, permission_code='record:view', scope='CONTRACT')
    services.save_assignment(assignment=assignment, actor=admin)
    return {'contract': contract, 'organization': organization, 'admin': admin, 'maria': maria}


def logged(username):
    client = APIClient()
    tokens = client.post('/api/v1/auth/login/', {'username': username, 'password': PASSWORD}, format='json').json()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    return client


def last_access():
    return AccessLog.objects.latest('id')


def test_anonymous_and_failed_api_requests_are_not_access_events():
    response = APIClient().get('/api/v1/me/organizations/', REMOTE_ADDR='198.51.100.4')
    assert response.status_code == 401
    assert not AccessLog.objects.exists()


def test_requests_outside_the_api_are_not_recorded():
    APIClient().get('/fora-da-api/')
    assert not AccessLog.objects.exists()


def test_login_records_who_entered_and_the_contract(world):
    logged('maria')
    access = last_access()
    assert (access.user, access.contract, access.organization) == (world['maria'], world['contract'], None)
    assert access.action == AccessLogAction.LOGIN_SUCCESS
    assert access.occurred_at.utcoffset().total_seconds() == 0


@pytest.mark.parametrize('quantity', [1, 30])
def test_ordinary_reads_do_not_write_access_logs(world, quantity):
    client = logged('maria')
    baseline = AccessLog.objects.count()
    with CaptureQueriesContext(connection) as queries:
        for _ in range(quantity):
            response = client.get('/api/v1/record/', HTTP_X_ORGANIZATION_ID=str(world['organization'].public_id))
            assert response.status_code == 200
    assert AccessLog.objects.count() == baseline
    assert not any('INSERT INTO' in query['sql'].upper() for query in queries)


def test_superadmin_without_organization_has_no_tenant(world):
    logged('admin').get('/api/v1/me/organizations/')
    access = last_access()
    assert (access.user, access.contract, access.organization) == (world['admin'], None, None)
    assert AccessLog.objects.count() == 1  # Só o login, não a consulta.


def test_request_that_fails_inside_business_view_does_not_create_access_event(world):
    client = logged('maria')
    client.raise_request_exception = False
    response = client.get('/api/v1/broken/', HTTP_X_ORGANIZATION_ID=str(world['organization'].public_id))
    assert response.status_code == 500
    assert AccessLog.objects.count() == 1
    assert last_access().action == AccessLogAction.LOGIN_SUCCESS


def test_proxy_headers_give_the_real_client_ip_and_port(settings):
    settings.ACCESS_LOG_CLIENT_IP_HEADER = 'X-Real-IP'
    settings.ACCESS_LOG_CLIENT_PORT_HEADER = 'X-Real-Port'
    APIClient().post(
        '/api/v1/auth/login/',
        {'username': 'unknown', 'password': PASSWORD},
        format='json',
        REMOTE_ADDR='10.0.0.1',
        HTTP_X_REAL_IP='203.0.113.9',
        HTTP_X_REAL_PORT='51234',
    )
    access = last_access()
    assert (access.ip, access.port) == ('203.0.113.9', 51234)


@pytest.mark.parametrize('ip_value, port_value', [('nao-e-ip', 'abc'), ('', '70000')])
def test_invalid_or_missing_proxy_headers_fall_back_to_the_connection(settings, ip_value, port_value):
    settings.ACCESS_LOG_CLIENT_IP_HEADER = 'X-Real-IP'
    settings.ACCESS_LOG_CLIENT_PORT_HEADER = 'X-Real-Port'
    APIClient().post(
        '/api/v1/auth/login/',
        {'username': 'unknown', 'password': PASSWORD},
        format='json',
        REMOTE_ADDR='10.0.0.1',
        REMOTE_PORT='40000',
        HTTP_X_REAL_IP=ip_value,
        HTTP_X_REAL_PORT=port_value,
    )
    access = last_access()
    assert (access.ip, access.port) == ('10.0.0.1', 40000)


def test_access_records_are_insert_only():
    APIClient().post('/api/v1/auth/login/', {'username': 'unknown', 'password': PASSWORD}, format='json')
    access = last_access()
    with pytest.raises(TypeError):
        access.save()
    with pytest.raises(TypeError):
        access.delete()
    with pytest.raises(TypeError):
        AccessLog.objects.all().update(port=1)
    with pytest.raises(TypeError):
        AccessLog.objects.all().delete()


def test_deploy_check_requires_proxy_headers(settings):
    settings.ACCESS_LOG_CLIENT_IP_HEADER = ''
    settings.ACCESS_LOG_CLIENT_PORT_HEADER = ''
    assert [warning.id for warning in check_access_log_proxy_headers(None)] == ['audit.W001', 'audit.W002']
    settings.ACCESS_LOG_CLIENT_IP_HEADER = 'X-Real-IP'
    settings.ACCESS_LOG_CLIENT_PORT_HEADER = 'X-Real-Port'
    assert check_access_log_proxy_headers(None) == []


def test_minimum_retention_is_declared_on_the_model():
    assert AccessLog.minimum_retention_months == 6


@pytest.mark.django_db(transaction=True)
def test_failed_login_survives_view_rollback_without_identifying_attempted_account(world):
    response = APIClient().post(
        '/api/v1/auth/login/',
        {'username': 'maria', 'password': 'wrong-password'},
        format='json',
        REMOTE_ADDR='198.51.100.4',
    )
    assert response.status_code == 401
    access = last_access()
    assert access.action == AccessLogAction.LOGIN_FAILURE
    assert (access.user_id, access.contract_id, access.organization_id) == (None, None, None)
    assert access.ip == '198.51.100.4'
    assert access.request_id == UUID(response['X-Request-Id'])


def test_contract_unavailable_login_is_a_failure(world):
    Contract.objects.filter(pk=world['contract'].pk).update(is_active=False)
    response = APIClient().post('/api/v1/auth/login/', {'username': 'maria', 'password': PASSWORD}, format='json')
    assert response.status_code == 403
    assert last_access().action == AccessLogAction.LOGIN_FAILURE
    assert last_access().user_id is None


def test_refresh_records_validated_user_without_extra_lookup(world):
    client = APIClient()
    tokens = client.post('/api/v1/auth/login/', {'username': 'maria', 'password': PASSWORD}, format='json').json()
    response = client.post('/api/v1/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
    assert response.status_code == 200
    access = last_access()
    assert access.action == AccessLogAction.REFRESH_SUCCESS
    assert (access.user_id, access.contract_id) == (world['maria'].pk, world['contract'].pk)
    assert access.request_id == UUID(response['X-Request-Id'])
    assert AccessLog.objects.count() == 2
    response = client.post('/api/v1/auth/logout/', {'refresh': response.json()['refresh']}, format='json')
    assert response.status_code == 204
    assert AccessLog.objects.count() == 2


@pytest.mark.parametrize('payload', [{'refresh': 'invalid-token'}, {}])
def test_failed_or_invalid_refresh_does_not_create_success_event(payload):
    response = APIClient().post('/api/v1/auth/refresh/', payload, format='json')
    assert response.status_code in (401, 422)
    assert not AccessLog.objects.exists()


def test_validation_and_throttle_rejections_do_not_create_login_events(world):
    client = APIClient()
    assert client.post('/api/v1/auth/login/', {}, format='json').status_code == 422
    assert not AccessLog.objects.exists()
    for _ in range(5):
        response = client.post('/api/v1/auth/login/', {'username': 'maria', 'password': 'wrong'}, format='json')
        assert response.status_code == 401
    response = client.post('/api/v1/auth/login/', {'username': 'maria', 'password': PASSWORD}, format='json')
    assert response.status_code == 429
    assert AccessLog.objects.count() == 5  # Nenhuma autenticação foi tentada na requisição bloqueada.
