from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.audit.models import AuditEvent
from apps.catalog.models import TrackedProduct
from apps.contracts.models import Contract, Organization
from apps.rbac.tests.test_permissions import assign

pytestmark = pytest.mark.django_db
URL = '/api/v1/products/'
PROBLEM = 'urn:dsync:problem:'
ALL_CODES = ('product:view', 'product:create', 'product:update', 'product:delete')


@pytest.fixture
def world(user_contract):
    admin = get_user_model().objects.create_superuser(username='admin')
    orgs = {name: Organization.objects.create(name=name, contract=user_contract) for name in ('Centro', 'Norte')}
    maria = get_user_model().objects.create_user(username='maria', contract=user_contract)
    return {'admin': admin, 'contract': user_contract, 'orgs': orgs, 'maria': maria}


def client(user, organization):
    api = APIClient()
    api.force_authenticate(user)
    api.credentials(HTTP_X_ORGANIZATION_ID=str(organization.public_id))
    return api


def grant(world, *codes, organization=None):
    for code in codes:
        assign(world['admin'], world['maria'], code=code, organization=organization)


def product(world, name='Impressora Multifuncional EcoTank', model='L3250', **extra):
    return TrackedProduct.objects.create(name=name, model=model, contract=world['contract'], **extra)


def detail(item):
    return f'{URL}{item.public_id}/'


def test_without_product_permission_access_is_denied(world):
    api = client(world['maria'], world['orgs']['Centro'])
    response = api.get(URL)
    assert response.status_code == 403 and response.json()['type'] == PROBLEM + 'context-forbidden'

    grant(world, 'organization:view', organization=world['orgs']['Centro'])
    response = api.get(URL)
    assert response.status_code == 403 and response.json()['type'] == PROBLEM + 'permission-denied'


def test_view_in_one_organization_lists_products_of_the_whole_contract(world):
    product(world)
    product(world, name='Notebook IdeaPad 3', model='15ITL6', brand='Lenovo')
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    TrackedProduct.objects.create(name='Produto alheio', model='X1', contract=other)
    grant(world, 'product:view', organization=world['orgs']['Norte'])

    response = client(world['maria'], world['orgs']['Norte']).get(URL)
    assert response.status_code == 200, response.content
    assert [item['model'] for item in response.json()['data']] == ['L3250', '15ITL6']
    assert set(response.json()['data'][0]) == {'public_id', 'name', 'model', 'brand', 'ean', 'created_at', 'updated_at'}


def test_product_of_another_contract_is_not_found(world):
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    foreign = TrackedProduct.objects.create(name='Produto alheio', model='X1', contract=other)
    grant(world, *ALL_CODES)
    api = client(world['maria'], world['orgs']['Centro'])
    assert api.get(detail(foreign)).status_code == 404
    assert api.delete(detail(foreign)).status_code == 404


def test_create_writes_contract_from_context_and_audits(world):
    grant(world, 'product:create')
    other = Contract.objects.create(name='Outro', start_date=date(2020, 1, 1), licenses=5)
    payload = {
        'name': ' Impressora EcoTank ',
        'model': ' L3250 ',
        'brand': 'Epson',
        'ean': '4006381333931',
        'contract': str(other.public_id),
    }

    response = client(world['maria'], world['orgs']['Centro']).post(URL, payload, format='json')
    assert response.status_code == 201, response.content
    created = TrackedProduct.objects.get(public_id=response.json()['public_id'])
    assert (created.name, created.model, created.contract_id) == ('Impressora EcoTank', 'L3250', world['contract'].pk)
    assert created.created_by == world['maria']
    event = AuditEvent.objects.get(event='product.created')
    assert event.target_public_id == created.public_id and event.changes['after']['model'] == 'L3250'


def test_name_and_model_are_required_and_brand_and_ean_optional(world):
    grant(world, 'product:create')
    api = client(world['maria'], world['orgs']['Centro'])
    response = api.post(URL, {'name': '  ', 'model': ''}, format='json')
    assert response.status_code == 422
    assert {'name', 'model'} <= set(response.json()['errors'])
    assert api.post(URL, {'name': 'Impressora', 'model': 'L3250'}, format='json').status_code == 201


@pytest.mark.parametrize('ean', ['123', '40063813339310', '4006381333932', 'ABCDEFGH', '96385075'])
def test_invalid_ean_is_rejected(world, ean):
    grant(world, 'product:create')
    response = client(world['maria'], world['orgs']['Centro']).post(
        URL, {'name': 'Impressora', 'model': 'L3250', 'ean': ean}, format='json'
    )
    assert response.status_code == 422 and 'ean' in response.json()['errors']


@pytest.mark.parametrize('ean', ['4006381333931', '96385074'])
def test_valid_ean_8_and_13_are_accepted(world, ean):
    grant(world, 'product:create')
    response = client(world['maria'], world['orgs']['Centro']).post(
        URL, {'name': 'Impressora', 'model': 'L3250', 'ean': ean}, format='json'
    )
    assert response.status_code == 201, response.content


def test_duplicate_name_and_model_is_blocked_ignoring_case_and_spaces(world):
    existing = product(world)
    grant(world, 'product:create', 'product:update', 'product:delete')
    api = client(world['maria'], world['orgs']['Centro'])
    duplicate = {'name': ' impressora multifuncional ecotank ', 'model': 'l3250'}

    response = api.post(URL, duplicate, format='json')
    assert response.status_code == 422 and 'name' in response.json()['errors']
    other = product(world, model='L3210')
    assert api.patch(detail(other), {'model': 'L3250'}, format='json').status_code == 422

    assert api.delete(detail(existing)).status_code == 204
    assert api.post(URL, duplicate, format='json').status_code == 201


def test_archive_is_a_soft_delete_that_leaves_the_list(world):
    item = product(world)
    grant(world, 'product:view', 'product:delete')
    api = client(world['maria'], world['orgs']['Centro'])

    assert api.delete(detail(item)).status_code == 204
    archived = TrackedProduct.all_objects.get(pk=item.pk)
    assert archived.deleted_at is not None and archived.deleted_by == world['maria']
    assert api.get(URL).json()['total_records'] == 0
    assert AuditEvent.objects.filter(event='product.deleted', target_public_id=item.public_id).exists()


def test_update_needs_its_own_permission(world):
    item = product(world)
    grant(world, 'product:view')
    api = client(world['maria'], world['orgs']['Centro'])
    assert api.patch(detail(item), {'brand': 'Epson'}, format='json').status_code == 403

    grant(world, 'product:update')
    response = api.patch(detail(item), {'brand': 'Epson'}, format='json')
    assert response.status_code == 200 and response.json()['brand'] == 'Epson'


def test_general_search_and_brand_filter(world):
    product(world, brand='Epson')
    product(world, name='Smart Tank', model='581', brand='HP')
    grant(world, 'product:view')
    api = client(world['maria'], world['orgs']['Centro'])

    assert [item['model'] for item in api.get(URL, {'search': 'l3250'}).json()['data']] == ['L3250']
    assert [item['model'] for item in api.get(URL, {'brand': 'hp'}).json()['data']] == ['581']


def test_list_query_count_does_not_grow_with_products(world):
    grant(world, 'product:view')
    api = client(world['maria'], world['orgs']['Centro'])

    def count_queries():
        with CaptureQueriesContext(connection) as queries:
            assert api.get(URL).status_code == 200
        return len(queries)

    product(world)
    few = count_queries()
    for index in range(9):
        product(world, model=f'M{index}')
    assert count_queries() == few
