from datetime import datetime, timedelta
from decimal import Decimal
from threading import Barrier

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.audit.models import AuditEvent
from apps.catalog.models import TrackedProduct
from apps.contracts.models import Organization
from apps.pricing import sources
from apps.pricing.models import PriceObservation, PriceSearch, PriceSearchItem, SearchItemStatus, SearchOffer
from apps.pricing.partitions import forget_ensured_partitions
from apps.pricing.sources import SourceOffer, SourceResult
from apps.rbac.tests.test_permissions import assign

pytestmark = pytest.mark.django_db
URL = '/api/v1/searches/'
PROBLEM = 'urn:dsync:problem:'
ML = 'mercado_livre'


class FakeConnector:
    """Conector de TESTE (identificado como tal): devolve o que o teste define."""

    source = ML
    mechanism = 'server'

    def __init__(self):
        self.result = SourceResult(status=SearchItemStatus.DONE, offers=())
        self.calls = 0
        self.error = None

    def search(self, product, *, seller_states, destination_zip):
        self.calls += 1
        if self.error:
            raise self.error
        return self.result


@pytest.fixture(autouse=True)
def isolate_process_state():
    forget_ensured_partitions()
    yield
    sources.CONNECTORS.pop(ML, None)
    forget_ensured_partitions()


@pytest.fixture
def fake():
    connector = FakeConnector()
    sources.CONNECTORS[ML] = connector
    return connector


@pytest.fixture
def world(user_contract):
    admin = get_user_model().objects.create_superuser(username='admin')
    orgs = {name: Organization.objects.create(name=name, contract=user_contract) for name in ('Centro', 'Norte')}
    maria = get_user_model().objects.create_user(username='maria', contract=user_contract)
    products = [
        TrackedProduct.objects.create(name=f'Produto {index}', model=f'M{index}', contract=user_contract)
        for index in range(11)
    ]
    for code in ('search:view', 'search:create', 'search:update'):
        assign(admin, maria, code=code)
    return {'contract': user_contract, 'orgs': orgs, 'maria': maria, 'admin': admin, 'products': products}


def client(world, organization='Centro'):
    api = APIClient()
    api.force_authenticate(world['maria'])
    api.credentials(HTTP_X_ORGANIZATION_ID=str(world['orgs'][organization].public_id))
    return api


def offer(listing, price, condition='new', **extra):
    return SourceOffer(
        listing_id=listing, price=Decimal(price), condition=condition, catalog_product_id='MLB1', **extra
    )


def create(world, count=2, **extra):
    payload = {'products': [str(p.public_id) for p in world['products'][:count]], 'sources': [ML], **extra}
    return client(world).post(URL, payload, format='json')


def run(world, search, item, action='run'):
    return client(world).post(f'{URL}{search["public_id"]}/items/{item["public_id"]}/{action}/')


def test_create_makes_one_pending_item_per_product_and_source_and_audits(world):
    response = create(world, seller_states=['SC', 'SC'], destination_zip='88010-000')
    assert response.status_code == 201, response.content
    body = response.json()
    assert [item['status'] for item in body['items']] == ['pending', 'pending']
    assert body['seller_states'] == ['SC'] and body['destination_zip'] == '88010000'
    assert body['items'][0]['source_label'] == 'Mercado Livre'
    assert AuditEvent.objects.filter(event='search.created').exists()


def test_search_filters_used_products_without_duplicates_or_other_organizations(world):
    for product in world['products'][:2]:
        product.name = 'Impressora Epson'
        product.save(update_fields=['name'])
    matching = create(world, count=2).json()
    other_product = (
        client(world)
        .post(URL, {'products': [str(world['products'][3].public_id)], 'sources': [ML]}, format='json')
        .json()
    )
    other_org = (
        client(world, 'Norte')
        .post(URL, {'products': [str(world['products'][0].public_id)], 'sources': [ML]}, format='json')
        .json()
    )
    response = client(world).get(URL, {'search': '  ePsOn  '})
    assert response.status_code == 200, response.content
    assert response.json()['total_records'] == 1
    assert [row['public_id'] for row in response.json()['data']] == [matching['public_id']]
    assert other_product['public_id'] != matching['public_id'] != other_org['public_id']
    by_model = client(world).get(URL, {'search': world['products'][0].model})
    assert by_model.json()['total_records'] == 1


def test_search_date_period_includes_complete_days_in_the_user_time_zone(world):
    world['maria'].time_zone = 'America/Sao_Paulo'
    world['maria'].save(update_fields=['time_zone'])
    dates = (
        '2026-11-07T03:00:00+00:00',
        '2026-11-08T02:59:59.999999+00:00',
        '2026-11-08T03:00:00+00:00',
        '2026-11-07T02:59:59.999999+00:00',
    )
    ids = []
    for date in dates:
        search = create(world, count=1).json()
        ids.append(search['public_id'])
        PriceSearch.objects.filter(public_id=search['public_id']).update(created_at=datetime.fromisoformat(date))
    response = client(world).get(URL, {'date_from': '2026-11-07', 'date_to': '2026-11-07'})
    assert response.status_code == 200, response.content
    assert {row['public_id'] for row in response.json()['data']} == set(ids[:2])
    schema = client(world).get(URL + 'schema/').json()
    assert schema['general_search']['fields'] == [{'field': 'product', 'label': 'Produto', 'lookup': 'icontains'}]
    dates_schema = [field for field in schema['filters'] if field['field'].startswith('date_')]
    assert [(field['field'], field['type'], field['placement']) for field in dates_schema] == [
        ('date_from', 'date', 'general'),
        ('date_to', 'date', 'general'),
    ]


@pytest.mark.parametrize(
    ('query', 'field'),
    [
        ({'date_from': '2026-99-07'}, 'date_from'),
        ({'date_to': 'ontem'}, 'date_to'),
        ({'date_from': '2026-11-08', 'date_to': '2026-11-07'}, 'date_to'),
    ],
)
def test_search_period_rejects_invalid_dates_with_problem_details(world, query, field):
    response = client(world).get(URL, query)
    assert response.status_code == 422
    assert response['Content-Type'] == 'application/problem+json'
    assert response.json()['type'] == PROBLEM + 'validation-error'
    assert field in response.json()['errors']


def test_filtered_search_list_has_constant_queries_and_server_pagination(world):
    api = client(world)
    create(world, count=1)
    query = {'search': 'Produto', 'date_from': '2026-01-01', 'date_to': '2026-12-31', 'rows': 10}
    api.get(URL, query)  # aquece caches de permissões
    with CaptureQueriesContext(connection) as first:
        assert api.get(URL, query).status_code == 200
    for _ in range(19):
        create(world, count=1)
    with CaptureQueriesContext(connection) as many:
        response = api.get(URL, query)
    assert response.status_code == 200, response.content
    assert response.json()['total_records'] == 20 and len(response.json()['data']) == 10
    assert len(first) == len(many)
    assert any('EXISTS' in item['sql'] for item in many)


@pytest.mark.parametrize(
    ('extra', 'field'),
    [
        ({'sources': ['olx']}, 'sources'),
        ({'seller_states': ['XX']}, 'seller_states'),
        ({'destination_zip': '880'}, 'destination_zip'),
    ],
)
def test_invalid_filters_are_rejected(world, extra, field):
    response = create(world, **extra)
    assert response.status_code == 422 and field in response.json()['errors']


def test_more_than_ten_products_is_rejected_with_the_limit_message(world):
    response = create(world, count=11)
    assert response.status_code == 422
    assert response.json()['errors']['products'] == ['Você pode pesquisar até 10 produtos por vez.']


def test_run_stores_offers_snapshot_and_global_observations(world, fake):
    fake.result = SourceResult(
        status=SearchItemStatus.DONE,
        offers=(offer('A', '100'), offer('B', '300'), offer('C', '200'), offer('U', '50', condition='used')),
    )
    search = create(world, count=1).json()
    response = run(world, search, search['items'][0])
    assert response.status_code == 200, response.content
    item = response.json()
    assert item['status'] == 'done' and item['offer_count'] == 3
    assert (item['min_price'], item['median_price'], item['avg_price'], item['max_price']) == (
        '100.00',
        '200.00',
        '200.00',
        '300.00',
    )
    used = SearchOffer.objects.get(listing_id='U')
    assert not used.eligible and used.ineligible_reason == 'not_new'
    assert PriceObservation.objects.unscoped().count() == 3  # só as elegíveis vão para a base global


def test_source_without_connector_is_unavailable_and_never_simulated(world):
    search = create(world, count=1).json()
    item = run(world, search, search['items'][0]).json()
    assert item['status'] == 'unavailable' and 'ainda não está disponível' in item['detail']
    assert item['min_price'] is None and SearchOffer.objects.count() == 0


def test_partial_failure_keeps_other_products(world, fake):
    search = create(world, count=2).json()
    first, second = search['items']
    fake.error = RuntimeError('timeout da fonte')
    assert run(world, search, first).json()['status'] == 'error'
    fake.error = None
    fake.result = SourceResult(status=SearchItemStatus.DONE, offers=(offer('A', '100'),))
    assert run(world, search, second).json()['status'] == 'done'


# Transacional: o handler de erro marca rollback, e a view sem ATOMIC_REQUESTS segue em outra requisição.
@pytest.mark.django_db(transaction=True)
def test_run_twice_conflicts_and_retry_only_after_failure(world, fake):
    search = create(world, count=1).json()
    item = search['items'][0]
    assert run(world, search, item, 'retry').status_code == 409  # pendente: use run
    fake.result = SourceResult(status=SearchItemStatus.UNAVAILABLE, detail='O site pediu verificação.')
    assert run(world, search, item).json()['status'] == 'unavailable'

    response = run(world, search, item)
    assert response.status_code == 409 and response.json()['type'] == PROBLEM + 'search-item-not-runnable'
    fake.result = SourceResult(status=SearchItemStatus.DONE, offers=(offer('A', '100'),))
    assert run(world, search, item, 'retry').json()['status'] == 'done'
    assert run(world, search, item, 'retry').status_code == 409  # concluída não refaz


def test_stale_running_item_can_be_retried(world, fake):
    search = create(world, count=1).json()
    PriceSearchItem.objects.filter(public_id=search['items'][0]['public_id']).update(
        status=SearchItemStatus.RUNNING, started_at=timezone.now() - timedelta(minutes=5)
    )
    fake.result = SourceResult(status=SearchItemStatus.DONE, offers=(offer('A', '100'),))
    assert run(world, search, search['items'][0], 'retry').json()['status'] == 'done'


def test_retry_needs_its_own_permission(world, fake):
    search = create(world, count=1).json()
    item = search['items'][0]
    fake.result = SourceResult(status=SearchItemStatus.UNAVAILABLE)
    run(world, search, item)
    world['maria'].refresh_from_db()
    other = get_user_model().objects.create_user(username='joao', contract=world['contract'])
    assign(world['admin'], other, code='search:create')
    api = APIClient()
    api.force_authenticate(other)
    api.credentials(HTTP_X_ORGANIZATION_ID=str(world['orgs']['Centro'].public_id))
    response = api.post(f'{URL}{search["public_id"]}/items/{item["public_id"]}/retry/')
    assert response.status_code == 403


def test_search_of_another_organization_is_not_found(world, fake):
    search = create(world, count=1).json()
    other = client(world, 'Norte')
    assert other.get(f'{URL}{search["public_id"]}/').status_code == 404
    url = f'{URL}{search["public_id"]}/items/{search["items"][0]["public_id"]}/run/'
    assert other.post(url).status_code == 404
    assert fake.calls == 0


def test_run_uses_constant_queries_regardless_of_offer_count(world, fake):
    def queries_for(total):
        fake.result = SourceResult(
            status=SearchItemStatus.DONE, offers=tuple(offer(f'L{total}-{n}', '100') for n in range(total))
        )
        search = create(world, count=1).json()
        with CaptureQueriesContext(connection) as captured:
            assert run(world, search, search['items'][0]).status_code == 200
        return len(captured)

    queries_for(1)  # aquece a memória de partições do processo
    assert queries_for(2) == queries_for(60)


@pytest.mark.django_db(transaction=True)
def test_concurrent_runs_of_the_same_item_execute_once(world, fake):
    barrier = Barrier(2)
    fake.result = SourceResult(status=SearchItemStatus.DONE, offers=(offer('A', '100'),))

    def slow_search(product, *, seller_states, destination_zip):
        fake.calls += 1
        return fake.result

    fake.search = slow_search
    search = create(world, count=1).json()
    item = search['items'][0]
    from concurrent.futures import ThreadPoolExecutor

    from django.db import close_old_connections

    def attempt():
        barrier.wait()
        try:
            return run(world, search, item).status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        codes = sorted(pool.map(lambda _: attempt(), range(2)))
    assert codes == [200, 409] and fake.calls == 1
