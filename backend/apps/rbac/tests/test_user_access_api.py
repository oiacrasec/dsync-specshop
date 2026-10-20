from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.audit.models import AuditEvent, AuditEventType
from apps.contracts.models import Contract, Organization
from apps.core.permission_registry import PERMISSIONS
from apps.rbac.models import Assignment, AssignmentExclusion
from apps.rbac.tests.test_permissions import assign, profile_with

pytestmark = pytest.mark.django_db
PROBLEM = 'urn:datasync:problem:'


@pytest.fixture
def world(user_contract, essential_profile):
    root = get_user_model().objects.create_superuser(username='root')
    matriz = Organization.objects.create(name='Matriz', contract=user_contract)
    filial = Organization.objects.create(name='Filial', contract=user_contract)
    manager = get_user_model().objects.create_user(username='gestora', contract=user_contract)
    assign(root, manager, profile=essential_profile)
    maria = get_user_model().objects.create_user(username='maria', contract=user_contract)
    reader = profile_with(root, user_contract, 'Leitor', 'organization:view')
    return {
        'root': root,
        'contract': user_contract,
        'matriz': matriz,
        'filial': filial,
        'manager': manager,
        'maria': maria,
        'reader': reader,
        'essential': essential_profile,
    }


def client(user, organization):
    api = APIClient()
    api.force_authenticate(user)
    api.credentials(HTTP_X_ORGANIZATION_ID=str(organization.public_id))
    return api


def url(user):
    return f'/api/v1/users/{user.public_id}/access/'


def put(world, payload, user=None):
    return client(world['manager'], world['matriz']).put(url(user or world['maria']), payload, format='json')


def test_get_returns_screen_data_and_current_grants(world):
    assign(world['root'], world['maria'], profile=world['reader'], excluded=[world['filial']])
    assign(world['root'], world['maria'], code='organization:update', organization=world['matriz'])
    data = client(world['manager'], world['matriz']).get(url(world['maria'])).json()
    assert [item['name'] for item in data['organizations']] == ['Filial', 'Matriz']
    profiles = {item['name']: item for item in data['profiles']}
    assert set(profiles) == {'Administrador do contrato', 'Leitor'}
    assert profiles['Leitor']['permissions'] == ['organization:view'] and not profiles['Leitor']['is_essential']
    essential = profiles['Administrador do contrato']
    assert essential['is_essential'] and essential['permissions'] == sorted(item.code for item in PERMISSIONS)
    grants = {(grant['scope'], grant['permission']): grant for grant in data['grants']}
    contract_grant = grants[('CONTRACT', '')]
    assert contract_grant['profile'] == str(world['reader'].public_id)
    assert contract_grant['excluded_organizations'] == [str(world['filial'].public_id)]
    assert grants[('ORGANIZATION', 'organization:update')]['organization'] == str(world['matriz'].public_id)
    manager_grants = client(world['manager'], world['matriz']).get(url(world['manager'])).json()['grants']
    assert [grant['profile'] for grant in manager_grants] == [str(world['essential'].public_id)]


def test_put_replaces_grants_and_audits_only_changes(world):
    maria = world['maria']
    kept = assign(world['root'], maria, profile=world['reader'], excluded=[world['filial']])
    removed = assign(world['root'], maria, code='organization:update', organization=world['filial'])
    before = AuditEvent.objects.count()
    payload = {
        'grants': [
            {
                'scope': 'CONTRACT',
                'profile': str(world['reader'].public_id),
                'excluded_organizations': [str(world['matriz'].public_id)],
            },
            {
                'scope': 'ORGANIZATION',
                'organization': str(world['matriz'].public_id),
                'permission': 'organization:update',
            },
        ],
    }
    response = put(world, payload)
    assert response.status_code == 200, response.content
    assert Assignment.objects.filter(pk=kept.pk).exists()
    assert not Assignment.objects.filter(pk=removed.pk).exists()
    exclusions = AssignmentExclusion.objects.filter(assignment=kept)
    assert list(exclusions.values_list('excluded_organization', flat=True)) == [world['matriz'].pk]
    events = list(AuditEvent.objects.order_by('pk')[before:].values_list('event', flat=True))
    assert sorted(events) == sorted(
        [
            AuditEventType.ASSIGNMENT_CREATED,
            AuditEventType.EXCLUSION_ADDED,
            AuditEventType.EXCLUSION_REMOVED,
            AuditEventType.ASSIGNMENT_DELETED,
        ]
    )
    assert put(world, payload).status_code == 200
    assert AuditEvent.objects.count() == before + len(events)  # Mesmo conjunto: nada gravado.


def test_essential_profile_is_applied_like_any_profile_and_keeps_last_admin_rule(world):
    admin = {'scope': 'CONTRACT', 'profile': str(world['essential'].public_id)}
    assert put(world, {'grants': [admin]}).json()['grants'][0]['profile'] == admin['profile']
    assert put(world, {'grants': []}).json()['grants'] == []
    response = put(world, {'grants': []}, user=world['manager'])
    assert response.status_code == 409 and response.json()['type'] == PROBLEM + 'last-contract-admin'
    assert Assignment.objects.filter(user=world['manager'], profile=world['essential']).exists()


@pytest.mark.parametrize(
    'grant',
    [
        {'scope': 'CONTRACT', 'permission': 'user:create'},  # Reservada.
        {'scope': 'CONTRACT', 'permission': 'record:view'},  # Fora do registry.
        {'scope': 'ORGANIZATION', 'permission': 'user:view', 'organization': 'MATRIZ'},  # Reservada e só CONTRACT.
        {'scope': 'CONTRACT', 'permission': 'organization:view', 'organization': 'MATRIZ'},
        {
            'scope': 'ORGANIZATION',
            'permission': 'organization:view',
            'organization': 'MATRIZ',
            'excluded_organizations': ['MATRIZ'],
        },
        {'scope': 'CONTRACT'},
        {'scope': 'ORGANIZATION', 'profile': 'ESSENTIAL', 'organization': 'MATRIZ'},  # Essencial só CONTRACT.
        {'scope': 'CONTRACT', 'profile': 'ESSENTIAL', 'excluded_organizations': ['MATRIZ']},  # Sem exceção.
    ],
)
def test_invalid_grants_are_rejected_without_writes(world, grant):
    assign(world['root'], world['maria'], profile=world['reader'])
    ids = {'MATRIZ': str(world['matriz'].public_id), 'ESSENTIAL': str(world['essential'].public_id)}
    grant = {
        key: ids.get(value, value) if isinstance(value, str) else [ids[item] for item in value]
        for key, value in grant.items()
    }
    before = Assignment.objects.count()
    response = put(world, {'grants': [grant]})
    assert response.status_code == 422, response.content
    assert Assignment.objects.count() == before


def test_other_contract_ids_and_users_are_isolated(world):
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    foreign_org = Organization.objects.create(name='Fora', contract=other)
    foreign_user = get_user_model().objects.create_user(username='fora', contract=other)
    grant = {'scope': 'ORGANIZATION', 'organization': str(foreign_org.public_id), 'permission': 'organization:view'}
    assert put(world, {'grants': [grant]}).status_code == 422
    api = client(world['manager'], world['matriz'])
    assert api.get(url(foreign_user)).status_code == 404
    assert api.put(url(foreign_user), {'grants': []}, format='json').status_code == 404


def test_management_is_reserved(world):
    assign(world['root'], world['maria'], profile=world['reader'])
    api = client(world['maria'], world['matriz'])
    assert api.get(url(world['manager'])).status_code == 403
    assert api.put(url(world['maria']), {'grants': []}, format='json').status_code == 403


def test_get_query_count_is_constant(world):
    api = client(world['manager'], world['matriz'])
    assign(world['root'], world['maria'], profile=world['reader'], excluded=[world['filial']])
    with CaptureQueriesContext(connection) as few:
        assert api.get(url(world['maria'])).status_code == 200
    for index in range(10):
        organization = Organization.objects.create(name=f'Org {index}', contract=world['contract'])
        profile = profile_with(world['root'], world['contract'], f'P{index}', 'organization:view')
        assign(world['root'], world['maria'], profile=profile, organization=organization)
    with CaptureQueriesContext(connection) as many:
        assert len(api.get(url(world['maria'])).json()['grants']) == 11
    assert len(few.captured_queries) == len(many.captured_queries)
