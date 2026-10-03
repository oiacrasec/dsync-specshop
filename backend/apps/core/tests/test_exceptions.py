import logging
from uuid import UUID

import pytest
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import SuspiciousOperation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import Http404
from django.urls import path
from rest_framework import exceptions, serializers
from rest_framework.authentication import BasicAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import (
    ContextForbidden,
    ContextInvalidRequest,
    ContractInactive,
    LastContractAdmin,
    LicenseLimitReached,
    ProfileInUse,
)
from apps.core.log_filters import request_id_context

PRIVATE_DETAIL = 'secret@example.com SELECT * FROM private_table /internal/private.py'


class ErrorView(APIView):
    permission_classes = [AllowAny]
    error = None

    def get(self, request):
        raise self.error


class ProtectedView(APIView):
    authentication_classes = [BasicAuthentication]

    def get(self, request):
        return Response({'ok': True})


class InputSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


class InputView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


def django_error(request):
    raise RuntimeError(PRIVATE_DETAIL)


def django_known_error(request, kind):
    errors = {
        'permission': DjangoPermissionDenied(PRIVATE_DETAIL),
        'not-found': Http404(PRIVATE_DETAIL),
        'syntax': SuspiciousOperation(PRIVATE_DETAIL),
        'validation': DjangoValidationError({'name': ['Nome obrigatório.']}),
        'domain': ProfileInUse(),
    }
    raise errors[kind]


def rollback_error(request):
    from django.contrib.auth import get_user_model

    get_user_model().objects.create_superuser(username='must-be-rolled-back')
    raise RuntimeError(PRIVATE_DETAIL)


class RollbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return rollback_error(request)


urlpatterns = [
    path('api/v1/protected/', transaction.non_atomic_requests(ProtectedView.as_view())),
    path('api/v1/input/', transaction.non_atomic_requests(InputView.as_view())),
    path('api/v1/django-error/', transaction.non_atomic_requests(django_error)),
    path('api/v1/django-known/<str:kind>/', transaction.non_atomic_requests(django_known_error)),
    path('api/v1/rollback/', RollbackView.as_view()),
]


@pytest.fixture
def test_routes(settings):
    settings.ROOT_URLCONF = __name__


@pytest.mark.parametrize(
    ('error', 'status', 'slug'),
    [
        (ContextInvalidRequest(), 400, 'context-invalid-request'),
        (ContextForbidden(), 403, 'context-forbidden'),
        (ContractInactive(), 403, 'contract-inactive'),
        (LicenseLimitReached(), 409, 'license-limit-reached'),
        (ProfileInUse(), 409, 'profile-in-use'),
        (LastContractAdmin(), 409, 'last-contract-admin'),
        (exceptions.PermissionDenied(PRIVATE_DETAIL), 403, 'permission-denied'),
        (DjangoPermissionDenied(PRIVATE_DETAIL), 403, 'permission-denied'),
        (exceptions.ParseError(PRIVATE_DETAIL), 400, 'malformed-request'),
        (SuspiciousOperation(PRIVATE_DETAIL), 400, 'malformed-request'),
        (exceptions.NotFound(PRIVATE_DETAIL), 404, 'not-found'),
        (Http404(PRIVATE_DETAIL), 404, 'not-found'),
        (exceptions.NotAuthenticated(PRIVATE_DETAIL), 401, 'authentication-required'),
        (exceptions.AuthenticationFailed(PRIVATE_DETAIL), 401, 'authentication-required'),
        (exceptions.ValidationError({'name': ['Nome obrigatório.']}), 422, 'validation-error'),
        (DjangoValidationError({'name': ['Nome obrigatório.']}), 422, 'validation-error'),
        (RuntimeError(PRIVATE_DETAIL), 500, None),
        (exceptions.APIException(PRIVATE_DETAIL), 500, None),
    ],
)
def test_exception_contract(rf, error, status, slug):
    request = rf.get('/api/v1/example/?token=private', HTTP_ACCEPT='text/html')
    request.request_id = '019a0000-0000-7000-8000-000000000001'
    response = ErrorView.as_view(error=error)(request)
    response.render()

    assert response.status_code == status
    assert response['Content-Type'] == 'application/problem+json'
    data = response.data
    assert data['status'] == status
    assert data['type'] == (f'urn:datasync:problem:{slug}' if slug else 'about:blank')
    assert data['instance'] == '/api/v1/example/'
    assert data['request_id'] == request.request_id
    assert PRIVATE_DETAIL not in response.content.decode()
    assert ('errors' in data) == (status == 422)
    if status == 401:
        assert response['WWW-Authenticate'].startswith('Bearer')


def test_nested_validation_errors(rf):
    error = exceptions.ValidationError(
        {
            'items': [{'quantity': ['Quantidade inválida.']}, {'name': ['Nome obrigatório.']}],
            'non_field_errors': ['Verifique os dados.'],
        }
    )
    response = ErrorView.as_view(error=error)(rf.get('/api/v1/example/'))

    assert response.data['errors'] == {
        'items.0.quantity': ['Quantidade inválida.'],
        'items.1.name': ['Nome obrigatório.'],
        'non_field_errors': ['Verifique os dados.'],
    }


@pytest.mark.parametrize(
    'error',
    [
        exceptions.MethodNotAllowed('GET'),
        exceptions.NotAcceptable(),
        exceptions.UnsupportedMediaType('text/plain'),
        exceptions.Throttled(wait=12),
    ],
)
def test_generic_problems_preserve_http_semantics(rf, error):
    response = ErrorView.as_view(error=error)(rf.get('/api/v1/example/'))
    response.render()

    assert response.status_code == error.status_code
    assert response.data['type'] == 'about:blank'
    assert response.data['status'] == error.status_code
    assert response['Content-Type'] == 'application/problem+json'
    if isinstance(error, exceptions.Throttled):
        assert response['Retry-After'] == '12'


def test_authentication_required_without_database(client, test_routes):
    response = client.get('/api/v1/protected/')

    assert response.status_code == 401
    assert response.json()['type'] == 'urn:datasync:problem:authentication-required'
    assert response['WWW-Authenticate'].startswith('Basic ')


@pytest.mark.parametrize(
    ('body', 'status', 'slug'),
    [
        ('{"quantity":', 400, 'malformed-request'),
        ('{"quantity":0}', 422, 'validation-error'),
    ],
)
def test_json_syntax_and_validation_have_distinct_statuses(client, test_routes, body, status, slug):
    response = client.post('/api/v1/input/', data=body, content_type='application/json')

    assert response.status_code == status
    assert response.json()['type'] == f'urn:datasync:problem:{slug}'


def test_request_id_correlates_response_and_logs(client, test_routes, caplog):
    with caplog.at_level(logging.WARNING, logger='apps.core.middleware'):
        response = client.post(
            '/api/v1/input/',
            data='{"quantity":0}',
            content_type='application/json',
            HTTP_X_REQUEST_ID='untrusted',
        )
    assert response.status_code == 422
    request_id = response['X-Request-Id']
    assert UUID(request_id).version == 7
    assert request_id != 'untrusted'
    record = next(record for record in caplog.records if record.name == 'apps.core.middleware')
    assert record.request_id == request_id
    assert record.levelno == logging.WARNING
    assert response.json()['request_id'] == request_id
    assert request_id_context.get() == '-'
    second = client.get('/api/v1/missing/')
    assert second['X-Request-Id'] != request_id
    assert second.json()['request_id'] == second['X-Request-Id']


def test_successful_request_has_id_without_completion_log(client, test_routes, caplog):
    with caplog.at_level(logging.DEBUG, logger='apps.core.middleware'):
        response = client.post('/api/v1/input/', data='{"quantity":2}', content_type='application/json')

    assert response.status_code == 200
    assert UUID(response['X-Request-Id']).version == 7
    assert not any(record.name == 'apps.core.middleware' for record in caplog.records)
    assert request_id_context.get() == '-'


@pytest.mark.parametrize('debug', [False, True])
def test_unknown_api_route_is_problem_even_in_debug(client, settings, debug):
    settings.DEBUG = debug
    response = client.get('/api/v1/missing/?token=private')

    assert response.status_code == 404
    assert response['Content-Type'] == 'application/problem+json'
    assert response.json()['type'] == 'urn:datasync:problem:not-found'
    assert response.json()['instance'] == '/api/v1/missing/'
    assert 'private' not in response.content.decode()


@pytest.mark.parametrize('debug', [False, True])
def test_django_failure_is_safe_and_correlated(client, test_routes, settings, caplog, debug):
    settings.DEBUG = debug
    response = client.get('/api/v1/django-error/')

    assert response.status_code == 500
    assert PRIVATE_DETAIL not in response.content.decode()
    assert PRIVATE_DETAIL not in caplog.text
    record = next(record for record in caplog.records if record.name == 'apps.core.exceptions')
    assert record.request_id == response.json()['request_id'] == response['X-Request-Id']
    assert 'RuntimeError' in record.getMessage()
    assert 'django_error' in record.getMessage()
    assert request_id_context.get() == '-'


@pytest.mark.parametrize(
    ('kind', 'status', 'slug'),
    [
        ('permission', 403, 'permission-denied'),
        ('not-found', 404, 'not-found'),
        ('syntax', 400, 'malformed-request'),
        ('validation', 422, 'validation-error'),
        ('domain', 409, 'profile-in-use'),
    ],
)
def test_django_errors_use_same_handler_as_drf(client, test_routes, kind, status, slug):
    response = client.get(f'/api/v1/django-known/{kind}/')

    assert response.status_code == status
    assert response['Content-Type'] == 'application/problem+json'
    assert response.json()['type'] == f'urn:datasync:problem:{slug}'
    assert PRIVATE_DETAIL not in response.content.decode()
    assert response.json()['request_id'] == response['X-Request-Id']


@pytest.mark.django_db(transaction=True)
def test_unexpected_failure_rolls_back_atomic_request(client, test_routes):
    from django.contrib.auth import get_user_model

    response = client.post('/api/v1/rollback/')

    assert response.status_code == 500
    assert not get_user_model().objects.filter(username='must-be-rolled-back').exists()
