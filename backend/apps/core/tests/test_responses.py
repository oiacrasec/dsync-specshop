import logging

import pytest
from django.http import Http404
from django.urls import include, path
from rest_framework import exceptions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.routers import SimpleRouter
from rest_framework.test import APIClient

from apps.contracts.models import Plan
from apps.core.exceptions import LicenseLimitReached
from apps.core.responses import build_exception_response, build_result_response

pytestmark = [pytest.mark.django_db(transaction=True), pytest.mark.urls(__name__)]
PRIVATE_DETAIL = 'secret@example.com SELECT * FROM private_table'


class CustomActionViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def execute(self, request):
        try:
            kind = request.data.get('kind')
            if kind == 'rollback':
                Plan.objects.unscoped().create(name='must-be-rolled-back')
            errors = {
                'validation': exceptions.ValidationError({'name': ['Nome obrigatório.']}),
                'not-found': Http404(PRIVATE_DETAIL),
                'permission': exceptions.PermissionDenied(PRIVATE_DETAIL),
                'authentication': exceptions.NotAuthenticated(PRIVATE_DETAIL),
                'throttled': exceptions.Throttled(wait=60),
                'domain': LicenseLimitReached(),
                'internal': RuntimeError(PRIVATE_DETAIL),
                'rollback': RuntimeError(PRIVATE_DETAIL),
            }
            if kind in errors:
                raise errors[kind]
            return build_result_response({'public_id': 'example'}, status_code=status.HTTP_201_CREATED)
        except Exception as exc:
            return build_exception_response(exception=exc, request=request)


router = SimpleRouter()
router.register('custom', CustomActionViewSet, basename='custom')
urlpatterns = [path('api/v1/', include(router.urls))]
URL = '/api/v1/custom/execute/'


def test_result_response_preserves_payload_and_status():
    response = APIClient().post(URL, {}, format='json')
    assert response.status_code == 201
    assert response.json() == {'public_id': 'example'}


@pytest.mark.parametrize(
    'kind,status_code,slug',
    [
        ('validation', 422, 'validation-error'),
        ('not-found', 404, 'not-found'),
        ('permission', 403, 'permission-denied'),
        ('authentication', 401, 'authentication-required'),
        ('domain', 409, 'license-limit-reached'),
        ('throttled', 429, None),
        ('internal', 500, None),
    ],
)
def test_caught_exceptions_keep_problem_details_headers_and_safe_logging(kind, status_code, slug, caplog):
    with caplog.at_level(logging.ERROR):
        response = APIClient().post(URL, {'kind': kind}, format='json', HTTP_ACCEPT='text/html')
    body = response.json()
    assert response.status_code == body['status'] == status_code
    assert response['Content-Type'] == 'application/problem+json'
    assert body['type'] == (f'urn:dsync:problem:{slug}' if slug else 'about:blank')
    assert body['instance'] == URL
    assert body['request_id'] == response['X-Request-Id']
    assert PRIVATE_DETAIL not in response.content.decode()
    assert PRIVATE_DETAIL not in caplog.text
    if kind == 'validation':
        assert body['errors'] == {'name': ['Nome obrigatório.']}
    if kind == 'authentication':
        assert response['WWW-Authenticate'] == 'Bearer'
    if kind == 'throttled':
        assert response['Retry-After'] == '60'


def test_caught_exception_rolls_back_request_transaction():
    response = APIClient().post(URL, {'kind': 'rollback'}, format='json')
    assert response.status_code == 500
    assert not Plan.objects.unscoped().filter(name='must-be-rolled-back').exists()
