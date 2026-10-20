from pathlib import Path

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db
URL = '/api/v1/schema/'
SCHEMA_FILE = Path(settings.BASE_DIR).parent / 'docs' / 'api' / 'openapi-v1.yaml'


def client(user=None):
    api = APIClient()
    if user is not None:
        api.force_authenticate(user)
    return api


def test_schema_requires_authentication():
    assert client().get(URL).status_code == 401


def test_customer_sees_only_the_customer_area_and_no_organization_header_is_needed(user_contract):
    maria = get_user_model().objects.create_user(username='maria', contract=user_contract)
    response = client(maria).get(URL, HTTP_ACCEPT='application/json')
    assert response.status_code == 200
    assert response['Cache-Control'].startswith('max-age=0')
    paths = response.json()['paths']
    assert '/api/v1/users/' in paths and '/api/v1/me/preferences/' in paths
    assert not [path for path in paths if path.startswith('/api/v1/admin/')]
    assert '/api/v1/schema/' not in paths


def test_superadmin_also_sees_the_admin_area():
    root = get_user_model().objects.create_superuser(username='root')
    paths = client(root).get(URL, HTTP_ACCEPT='application/json').json()['paths']
    assert '/api/v1/admin/contracts/' in paths and '/api/v1/users/' in paths


def test_schema_documents_context_header_jwt_and_problem_details(user_contract):
    root = get_user_model().objects.create_superuser(username='root')
    schema = client(root).get(URL, HTTP_ACCEPT='application/json').json()
    users = schema['paths']['/api/v1/users/']['get']
    assert 'X-Organization-Id' in [parameter['name'] for parameter in users['parameters']]
    assert schema['components']['securitySchemes']['jwt'] == {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'}
    assert 'application/problem+json' in users['responses']['403']['content']
    login = schema['paths']['/api/v1/auth/login/']['post']
    assert '401' not in login['responses'] and 'X-Organization-Id' not in str(login.get('parameters'))


def test_versioned_schema_file_matches_the_code(tmp_path):
    generated = tmp_path / 'openapi-v1.yaml'
    call_command('spectacular', '--validate', '--fail-on-warn', file=str(generated))
    assert generated.read_text() == SCHEMA_FILE.read_text(), (
        'docs/api/openapi-v1.yaml desatualizado: rode manage.py spectacular --validate --fail-on-warn '
        '--file ../docs/api/openapi-v1.yaml'
    )
