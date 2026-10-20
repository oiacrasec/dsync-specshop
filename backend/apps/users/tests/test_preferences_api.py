import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db
URL = '/api/v1/me/preferences/'
DEFAULTS = {'preset': 'Aura', 'primary': 'blue', 'dark_mode': False, 'menu_mode': 'static'}
CHOSEN = {'preset': 'Lara', 'primary': 'noir', 'dark_mode': True, 'menu_mode': 'slim'}


def client(user=None):
    api = APIClient()
    if user is not None:
        api.force_authenticate(user)
    return api


@pytest.fixture
def maria(user_contract):
    return get_user_model().objects.create_user(username='maria', contract=user_contract)


def test_defaults_until_the_user_chooses_and_then_the_choice_is_kept(maria):
    api = client(maria)
    assert api.get(URL).json() == DEFAULTS
    response = api.put(URL, CHOSEN, format='json')
    assert response.status_code == 200 and response.json() == CHOSEN
    maria.refresh_from_db()
    assert maria.preferences == CHOSEN
    assert client(maria).get(URL).json() == CHOSEN
    assert response['Cache-Control'].startswith('max-age=0')


def test_works_without_organization_header_also_for_superadmin():
    root = get_user_model().objects.create_superuser(username='root')
    assert client(root).put(URL, CHOSEN, format='json').status_code == 200
    assert client(root).get(URL).json() == CHOSEN


@pytest.mark.parametrize(
    'payload',
    [
        {**CHOSEN, 'preset': 'Material'},
        {**CHOSEN, 'primary': '#ff0000'},
        {**CHOSEN, 'menu_mode': 'floating'},
        {key: value for key, value in CHOSEN.items() if key != 'dark_mode'},
    ],
)
def test_unknown_values_are_rejected(maria, payload):
    response = client(maria).put(URL, payload, format='json')
    assert response.status_code == 422
    maria.refresh_from_db()
    assert maria.preferences == {}


def test_extra_keys_are_not_stored_and_stale_values_fall_back_to_defaults(maria):
    client(maria).put(URL, {**CHOSEN, 'script': '<x>'}, format='json')
    maria.refresh_from_db()
    assert 'script' not in maria.preferences
    get_user_model().objects.filter(pk=maria.pk).update(preferences={'preset': 'Removido'})
    maria.refresh_from_db()
    assert client(maria).get(URL).json() == DEFAULTS


def test_requires_authentication_and_writes_one_row(maria):
    assert client().get(URL).status_code == 401
    with CaptureQueriesContext(connection) as queries:
        client(maria).put(URL, CHOSEN, format='json')
    assert sum(query['sql'].startswith('UPDATE') for query in queries.captured_queries) == 1
