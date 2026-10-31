from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.audit.models import AuditEvent, AuditEventType
from apps.contracts.models import Contract, Organization
from apps.core.permission_registry import PERMISSIONS
from apps.rbac import services
from apps.rbac.models import Profile
from apps.rbac.tests.test_permissions import assign, profile_with

pytestmark = pytest.mark.django_db
URL = '/api/v1/profiles/'
PROBLEM = 'urn:dsync:problem:'


@pytest.fixture
def world(user_contract, essential_profile):
    root = get_user_model().objects.create_superuser(username='root')
    organization = Organization.objects.create(name='Matriz', contract=user_contract)
    manager = get_user_model().objects.create_user(username='gestora', contract=user_contract)
    assign(root, manager, profile=essential_profile)
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    return {
        'root': root,
        'contract': user_contract,
        'org': organization,
        'manager': manager,
        'other': other,
        'essential': essential_profile,
    }


def client(user, organization):
    api = APIClient()
    api.force_authenticate(user)
    api.credentials(HTTP_X_ORGANIZATION_ID=str(organization.public_id))
    return api


def detail(profile):
    return f'{URL}{profile.public_id}/'


def test_catalog_groups_codes_with_labels():
    api = APIClient()
    api.force_authenticate(get_user_model().objects.create_superuser(username='root'))
    catalog = api.get('/api/v1/permissions/').json()
    organizations = next(group for group in catalog if group['resource'] == 'organization')
    assert organizations['label'] == 'Organizações'
    view = next(item for item in organizations['permissions'] if item['code'] == 'organization:view')
    assert view == {
        'code': 'organization:view',
        'action': 'view',
        'label': 'Visualizar',
        'scopes': ['CONTRACT', 'ORGANIZATION'],
        'reserved': False,
    }
    users = next(group for group in catalog if group['resource'] == 'user')
    assert {item['code']: item['label'] for item in users['permissions']}['user:manage'] == 'Redefinir senha'
    assert sum(len(group['permissions']) for group in catalog) == len(list(PERMISSIONS))
    assert APIClient().get('/api/v1/permissions/').status_code == 401


def test_contract_admin_creates_updates_and_deletes_a_profile(world):
    api = client(world['manager'], world['org'])
    response = api.post(
        URL, {'name': ' Leitor ', 'permissions': ['organization:view', 'organization:view']}, format='json'
    )
    assert response.status_code == 201, response.content
    data = response.json()
    assert (data['name'], data['permissions'], data['is_system']) == ('Leitor', ['organization:view'], False)
    profile = Profile.objects.get(public_id=data['public_id'])
    assert profile.contract_id == world['contract'].pk and profile.created_by == world['manager']

    response = api.patch(detail(profile), {'permissions': ['organization:update', 'organization:view']}, format='json')
    assert response.json()['permissions'] == ['organization:update', 'organization:view']
    response = api.patch(detail(profile), {'permissions': ['organization:update']}, format='json')
    assert response.json()['permissions'] == ['organization:update']
    assert api.delete(detail(profile)).status_code == 204
    events = set(AuditEvent.objects.values_list('event', flat=True))
    assert {
        AuditEventType.PROFILE_CREATED,
        AuditEventType.PROFILE_PERMISSION_ADDED,
        AuditEventType.PROFILE_PERMISSION_REMOVED,
        AuditEventType.PROFILE_DELETED,
    } <= events


def test_reserved_and_unknown_codes_are_rejected(world):
    api = client(world['manager'], world['org'])
    for code in ('user:create', 'record:view'):
        response = api.post(URL, {'name': f'P {code}', 'permissions': [code]}, format='json')
        assert response.status_code == 422, code
        assert not Profile.objects.filter(name=f'P {code}').exists()


def test_list_shows_contract_and_system_profiles_with_flags(world):
    profile_with(world['root'], world['contract'], 'Leitor', 'organization:view')
    profile_with(world['root'], world['other'], 'Alheio')
    rows = {row['name']: row for row in client(world['manager'], world['org']).get(URL).json()['data']}
    assert set(rows) == {'Leitor', 'Administrador do contrato'}
    essential = client(world['manager'], world['org']).get(detail(world['essential'])).json()
    assert essential['is_system'] and essential['is_essential']
    assert essential['permissions'] == sorted(definition.code for definition in PERMISSIONS)


def test_system_and_other_contract_profiles_are_read_only(world):
    api = client(world['manager'], world['org'])
    response = api.patch(detail(world['essential']), {'name': 'Hack'}, format='json')
    assert response.status_code == 403
    foreign = profile_with(world['root'], world['other'], 'Alheio')
    assert api.patch(detail(foreign), {'name': 'X'}, format='json').status_code == 404
    assert api.delete(detail(foreign)).status_code == 404


def test_profile_in_use_cannot_be_deleted(world):
    profile = profile_with(world['root'], world['contract'], 'Leitor', 'organization:view')
    maria = get_user_model().objects.create_user(username='maria', contract=world['contract'])
    assign(world['root'], maria, profile=profile)
    response = client(world['manager'], world['org']).delete(detail(profile))
    assert response.status_code == 409 and response.json()['type'] == PROBLEM + 'profile-in-use'


def test_name_conflicts_with_system_profile_or_same_contract(world):
    api = client(world['manager'], world['org'])
    assert api.post(URL, {'name': 'Administrador do contrato'}, format='json').status_code == 422
    assert api.post(URL, {'name': 'Leitor'}, format='json').status_code == 201
    assert api.post(URL, {'name': 'Leitor'}, format='json').status_code == 422


def test_management_is_reserved(world):
    viewer = profile_with(world['root'], world['contract'], 'Leitor', 'organization:view')
    maria = get_user_model().objects.create_user(username='maria', contract=world['contract'])
    assign(world['root'], maria, profile=viewer)
    api = client(maria, world['org'])
    assert api.get(URL).status_code == 403
    assert api.post(URL, {'name': 'X'}, format='json').status_code == 403


def test_services_scope_contract_admin_to_own_contract(world):
    manager = world['manager']
    with pytest.raises(PermissionDenied):
        services.save_profile(profile=Profile(name='Fora', contract=world['other']), actor=manager)
    with pytest.raises(PermissionDenied):
        services.save_profile(profile=Profile(name='Sistema'), actor=manager)
    foreign = profile_with(world['root'], world['other'], 'Alheio')
    forged = Profile.objects.get(pk=foreign.pk)
    forged.contract_id = world['contract'].pk
    with pytest.raises(PermissionDenied):
        services.save_profile(profile=forged, actor=manager)
    with pytest.raises(PermissionDenied):
        services.delete_profile(profile=forged, actor=manager)
    common = get_user_model().objects.create_user(username='comum', contract=world['contract'])
    with pytest.raises(PermissionDenied):
        services.save_profile(profile=Profile(name='Comum', contract=world['contract']), actor=common)


def test_list_query_count_is_constant(world):
    api = client(world['manager'], world['org'])
    profile_with(world['root'], world['contract'], 'P0', 'organization:view')
    with CaptureQueriesContext(connection) as few:
        assert api.get(URL).status_code == 200
    for index in range(1, 25):
        profile_with(world['root'], world['contract'], f'P{index}', 'organization:view', 'organization:update')
    with CaptureQueriesContext(connection) as many:
        assert api.get(URL, {'rows': 100}).json()['total_records'] == 26
    assert len(few.captured_queries) == len(many.captured_queries)
