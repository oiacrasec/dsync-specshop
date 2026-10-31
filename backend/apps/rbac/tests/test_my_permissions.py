import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.contracts.models import Contract, Organization
from apps.core.permission_registry import PERMISSIONS
from apps.rbac.models import Assignment
from apps.rbac.tests.test_permissions import assign, profile_with

pytestmark = pytest.mark.django_db
URL = '/api/v1/me/permissions/'
PROBLEM = 'urn:dsync:problem:'
ALL_CODES = sorted(definition.code for definition in PERMISSIONS)


@pytest.fixture
def admin():
    return get_user_model().objects.create_superuser(username='admin')


@pytest.fixture
def maria(user_contract):
    return get_user_model().objects.create_user(username='maria', contract=user_contract)


@pytest.fixture
def orgs(user_contract):
    return {name: Organization.objects.create(name=name, contract=user_contract) for name in ('obras', 'saude')}


def get(user, organization=None, header=None):
    client = APIClient()
    client.force_authenticate(user)
    value = header if header is not None else (str(organization.public_id) if organization else None)
    return client.get(URL, **({'HTTP_X_ORGANIZATION_ID': value} if value is not None else {}))


def test_returns_effective_codes_in_the_active_organization(admin, maria, orgs):
    viewer = profile_with(admin, maria.contract, 'Leitor', 'organization:view')
    assign(admin, maria, profile=viewer, excluded=[orgs['saude']])
    assign(admin, maria, code='organization:update', organization=orgs['obras'])

    response = get(maria, orgs['obras'])
    assert response.status_code == 200, response.content
    assert response.json() == {'permissions': ['organization:update', 'organization:view']}
    assert 'no-store' in response['Cache-Control']


def test_organization_out_of_reach_or_missing_header_follows_context_rules(admin, maria, orgs):
    viewer = profile_with(admin, maria.contract, 'Leitor', 'organization:view')
    assign(admin, maria, profile=viewer, excluded=[orgs['saude']])

    assert get(maria, orgs['saude']).json()['type'] == PROBLEM + 'context-forbidden'
    assert get(maria).status_code == 400
    assert get(maria, header='invalido').json()['type'] == PROBLEM + 'context-invalid-request'
    other = Organization.objects.create(
        name='alheia', contract=Contract.objects.create(name='Outro', start_date='2020-01-01', licenses=5)
    )
    assert get(maria, other).status_code == 403


def test_user_without_grants_is_forbidden(maria, orgs):
    assert get(maria, orgs['obras']).json()['type'] == PROBLEM + 'context-forbidden'


def test_essential_profile_and_superadmin_have_every_code(admin, maria, orgs, essential_profile):
    assign(admin, maria, profile=essential_profile)
    assert get(maria, orgs['obras']).json() == {'permissions': ALL_CODES}
    assert get(admin, orgs['obras']).json() == {'permissions': ALL_CODES}


def test_inactive_grant_gives_no_permission(admin, maria, orgs):
    assignment = assign(admin, maria, code='organization:view')
    Assignment.objects.filter(pk=assignment.pk).update(is_active=False)
    assert get(maria, orgs['obras']).status_code == 403


def test_requires_authentication():
    assert APIClient().get(URL).status_code == 401


def test_query_count_is_constant_and_reads_do_not_write(admin, maria, orgs):
    viewer = profile_with(admin, maria.contract, 'Leitor', 'organization:view')
    assign(admin, maria, profile=viewer)
    with CaptureQueriesContext(connection) as few:
        assert get(maria, orgs['obras']).status_code == 200
    for index in range(30):
        Organization.objects.create(name=f'extra{index}', contract=maria.contract)
    assign(admin, maria, code='organization:update', organization=orgs['saude'])
    with CaptureQueriesContext(connection) as many:
        assert get(maria, orgs['obras']).status_code == 200
    assert len(few.captured_queries) == len(many.captured_queries)
    assert not [q for q in many.captured_queries if q['sql'].startswith(('INSERT', 'UPDATE', 'DELETE'))]
