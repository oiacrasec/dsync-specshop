from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier

import pytest
from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.audit.models import AuditEvent, AuditEventType
from apps.contracts.models import Contract, Organization
from apps.rbac.models import Assignment
from apps.rbac.tests.test_permissions import assign, profile_with

pytestmark = pytest.mark.django_db
URL = '/api/v1/organizations/'
PROBLEM = 'urn:datasync:problem:'


@pytest.fixture
def admin():
    return get_user_model().objects.create_superuser(username='admin')


@pytest.fixture
def world(admin, user_contract):
    orgs = {name: Organization.objects.create(name=name, contract=user_contract) for name in ('Matriz', 'Filial')}
    maria = get_user_model().objects.create_user(username='maria', contract=user_contract)
    return {'admin': admin, 'contract': user_contract, 'orgs': orgs, 'maria': maria}


def client(user, organization):
    api = APIClient()
    api.force_authenticate(user)
    if organization is not None:
        api.credentials(HTTP_X_ORGANIZATION_ID=str(organization.public_id))
    return api


def grant(world, *codes, organization=None):
    """Permissões avulsas de maria; organization=None → escopo do contrato."""
    for code in codes:
        assign(world['admin'], world['maria'], code=code, organization=organization)


def detail(organization):
    return f'{URL}{organization.public_id}/'


def test_view_in_one_organization_lists_the_whole_contract(world):
    matriz, filial = world['orgs']['Matriz'], world['orgs']['Filial']
    grant(world, 'organization:view', organization=filial)
    Organization.objects.create(
        name='Outra', contract=Contract.objects.create(name='X', start_date=date(2020, 1, 1), licenses=5)
    )

    response = client(world['maria'], filial).get(URL)
    assert response.status_code == 200, response.content
    assert [item['name'] for item in response.json()['data']] == ['Filial', 'Matriz']
    assert response.json()['total_records'] == 2
    assert client(world['maria'], filial).get(detail(matriz)).json()['name'] == 'Matriz'


def test_update_and_delete_in_any_scope_reach_any_organization_of_the_contract(world):
    filial = world['orgs']['Filial']
    other = Organization.objects.create(name='Obras', contract=world['contract'])
    grant(world, 'organization:update', 'organization:delete', organization=filial)

    api = client(world['maria'], filial)
    assert api.patch(detail(other), {'name': 'Obras Centrais'}, format='json').status_code == 200
    assert api.delete(detail(other)).status_code == 204
    other.refresh_from_db()
    assert other.name == 'Obras Centrais' and other.deleted_by == world['maria']


def test_create_needs_contract_scope_and_writes_contract_from_context(world):
    filial = world['orgs']['Filial']
    grant(world, 'organization:view', organization=filial)
    api = client(world['maria'], filial)
    assert api.post(URL, {'name': 'Nova'}, format='json').status_code == 403

    grant(world, 'organization:create')
    other = Contract.objects.create(name='X', start_date=date(2020, 1, 1), licenses=5)
    response = api.post(URL, {'name': 'Nova', 'contract': str(other.public_id)}, format='json')
    assert response.status_code == 201, response.content
    created = Organization.objects.get(public_id=response.json()['public_id'])
    assert created.contract_id == world['contract'].pk and created.created_by == world['maria']
    assert set(response.json()) == {'public_id', 'name', 'is_active', 'created_at', 'updated_at'}


def test_create_granted_in_one_organization_creates_for_the_contract(world):
    filial = world['orgs']['Filial']
    grant(world, 'organization:create', organization=filial)
    response = client(world['maria'], filial).post(URL, {'name': 'Nova'}, format='json')
    assert response.status_code == 201, response.content
    assert Organization.objects.get(public_id=response.json()['public_id']).contract_id == world['contract'].pk


def test_each_action_requires_its_own_code(world):
    filial = world['orgs']['Filial']
    grant(world, 'organization:view', organization=filial)
    api = client(world['maria'], filial)
    assert api.patch(detail(filial), {'name': 'X'}, format='json').status_code == 403
    assert api.delete(detail(world['orgs']['Matriz'])).status_code == 403
    for path in ('', 'options/', 'schema/'):
        assert api.get(URL + path).status_code == 200


@pytest.mark.parametrize('path', ['', 'options/', 'schema/'])
def test_without_view_code_reads_are_denied(world, path):
    filial = world['orgs']['Filial']
    grant(world, 'organization:update', organization=filial)
    response = client(world['maria'], filial).get(URL + path)
    assert response.status_code == 403
    assert response.json()['type'] == PROBLEM + 'permission-denied'


def test_context_rules_still_apply(world):
    matriz, filial = world['orgs']['Matriz'], world['orgs']['Filial']
    grant(world, 'organization:view', organization=filial)
    assert client(world['maria'], None).get(URL).status_code == 400
    response = client(world['maria'], matriz).get(URL)  # Sem acesso à organização ativa.
    assert response.json()['type'] == PROBLEM + 'context-forbidden'
    assert APIClient().get(URL).status_code == 401


def test_other_contract_records_are_not_found(world):
    filial = world['orgs']['Filial']
    grant(world, 'organization:view', 'organization:update', 'organization:delete', organization=filial)
    foreign = Organization.objects.create(
        name='Alheia', contract=Contract.objects.create(name='X', start_date=date(2020, 1, 1), licenses=5)
    )
    api = client(world['maria'], filial)
    assert api.get(detail(foreign)).status_code == 404
    assert api.patch(detail(foreign), {'name': 'Y'}, format='json').status_code == 404
    assert api.delete(detail(foreign)).status_code == 404


def test_name_is_unique_in_the_contract_ignoring_case(world):
    filial = world['orgs']['Filial']
    grant(world, 'organization:create', 'organization:update')
    api = client(world['maria'], filial)
    response = api.post(URL, {'name': ' matriz '}, format='json')
    assert response.status_code == 422 and 'name' in response.json()['errors']
    assert api.patch(detail(filial), {'name': 'MATRIZ'}, format='json').status_code == 422
    assert api.patch(detail(filial), {'name': 'filial'}, format='json').status_code == 200  # Próprio nome.
    assert api.post(URL, {'name': '   '}, format='json').status_code == 422
    world['orgs']['Matriz'].delete(actor=world['admin'])
    assert api.post(URL, {'name': 'Matriz'}, format='json').status_code == 201  # Excluída não conta.


def test_last_active_organization_cannot_be_deactivated_or_deleted(world):
    matriz, filial = world['orgs']['Matriz'], world['orgs']['Filial']
    grant(world, 'organization:view', 'organization:update', 'organization:delete')
    api = client(world['maria'], filial)
    assert api.patch(detail(matriz), {'is_active': False}, format='json').status_code == 200

    response = api.patch(detail(filial), {'is_active': False}, format='json')
    assert response.json()['type'] == PROBLEM + 'last-active-organization'
    response = api.delete(detail(filial))
    assert response.status_code == 409 and response.json()['type'] == PROBLEM + 'last-active-organization'
    assert api.delete(detail(matriz)).status_code == 204  # Inativa pode sair.


def test_organization_targeted_by_assignments_or_exclusions_is_in_use(world):
    matriz, filial = world['orgs']['Matriz'], world['orgs']['Filial']
    grant(world, 'organization:view', 'organization:delete')
    bia = get_user_model().objects.create_user(username='bia', contract=world['contract'])
    viewer = profile_with(world['admin'], world['contract'], 'Leitor', 'organization:view')
    assign(world['admin'], bia, profile=viewer, excluded=[matriz])
    obras = Organization.objects.create(name='Obras', contract=world['contract'])
    assign(world['admin'], bia, code='organization:view', organization=obras)

    api = client(world['maria'], filial)
    for target in (matriz, obras):
        response = api.delete(detail(target))
        assert response.status_code == 409 and response.json()['type'] == PROBLEM + 'organization-in-use'
    Assignment.objects.filter(scope_organization=obras).update(deleted_at=obras.created_at)
    assert api.delete(detail(obras)).status_code == 204


def test_writes_are_audited_without_the_name(world):
    filial = world['orgs']['Filial']
    grant(world, 'organization:create', 'organization:update', 'organization:delete')
    api = client(world['maria'], filial)
    public_id = api.post(URL, {'name': 'Cliente secreto'}, format='json').json()['public_id']
    api.patch(f'{URL}{public_id}/', {'is_active': False}, format='json')
    api.delete(f'{URL}{public_id}/')
    events = AuditEvent.objects.filter(target_public_id=public_id).order_by('created_at')
    assert [event.event for event in events] == [
        AuditEventType.ORGANIZATION_CREATED,
        AuditEventType.ORGANIZATION_UPDATED,
        AuditEventType.ORGANIZATION_DELETED,
    ]
    assert all(event.contract_id == world['contract'].pk and event.created_by == world['maria'] for event in events)
    assert 'Cliente secreto' not in str([event.changes for event in events])


def test_essential_profile_manages_everything(world, essential_profile):
    assign(world['admin'], world['maria'], profile=essential_profile)
    api = client(world['maria'], world['orgs']['Filial'])
    assert api.post(URL, {'name': 'Nova'}, format='json').status_code == 201
    assert api.get(URL).json()['total_records'] == 3


def test_list_query_count_is_constant_and_reads_do_not_write(world):
    filial = world['orgs']['Filial']
    grant(world, 'organization:view', organization=filial)
    api = client(world['maria'], filial)
    with CaptureQueriesContext(connection) as few:
        assert api.get(URL).status_code == 200
    for index in range(30):
        Organization.objects.create(name=f'Extra {index}', contract=world['contract'])
    with CaptureQueriesContext(connection) as many:
        assert api.get(URL, {'rows': 100}).json()['total_records'] == 32
    assert len(few.captured_queries) == len(many.captured_queries)
    assert not [q for q in many.captured_queries if q['sql'].startswith(('INSERT', 'UPDATE', 'DELETE'))]


@pytest.mark.django_db(transaction=True)
def test_concurrent_deactivation_keeps_one_active_organization(world):
    matriz, filial = world['orgs']['Matriz'], world['orgs']['Filial']
    grant(world, 'organization:view', 'organization:update')
    barrier = Barrier(2)

    def deactivate(target):
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            response = client(world['maria'], filial).patch(detail(target), {'is_active': False}, format='json')
            return response.status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(deactivate, (matriz, filial))) == [200, 409]
    assert Organization.objects.filter(contract=world['contract'], is_active=True).count() == 1


def test_options_follow_the_view_permission_classes(world):
    # options usa as mesmas classes da view: view concedido em outra organização vale no contrato.
    matriz, filial = world['orgs']['Matriz'], world['orgs']['Filial']
    grant(world, 'organization:view', organization=matriz)
    grant(world, 'organization:update', organization=filial)
    response = client(world['maria'], filial).get(URL + 'options/')
    assert response.status_code == 200, response.content
    assert [item['label'] for item in response.json()['data']] == ['Filial', 'Matriz']
