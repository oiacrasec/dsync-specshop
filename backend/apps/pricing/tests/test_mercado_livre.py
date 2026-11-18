"""Conector do Mercado Livre com transporte FALSO: nenhum teste chama a API real."""

import json
import logging
from decimal import Decimal
from urllib.parse import parse_qsl, urlsplit

import pytest
from django.core.cache import cache

from apps.catalog.models import TrackedProduct
from apps.pricing import mercado_livre as ml
from apps.pricing import sources
from apps.pricing.apps import PricingConfig
from apps.pricing.mercado_livre import MercadoLivreConnector, MercadoLivreError
from apps.pricing.models import InvoiceDeclaration, OfferCondition, SearchItemStatus

SECRET = 'segredo-de-teste-nao-vazar'
TOKEN = 'token-de-teste'


class FakeML:
    """API falsa: cada rota devolve (status, corpo) fixo ou calculado pelos parâmetros."""

    def __init__(self, routes):
        self.routes = {'/oauth/token': (200, {'access_token': TOKEN, 'expires_in': 21600}), **routes}
        self.calls = []

    def __call__(self, method, url, *, headers, body, timeout):
        parts = urlsplit(url)
        params = dict(parse_qsl(parts.query))
        self.calls.append({'method': method, 'path': parts.path, 'params': params, 'headers': headers, 'body': body})
        route = self.routes[parts.path]
        status, payload = route(params) if callable(route) else route
        return status, json.dumps(payload).encode()

    def paths(self):
        return [call['path'] for call in self.calls]


def items_page(rows, total, offset=0):
    return 200, {'paging': {'total': total, 'offset': offset, 'limit': 100}, 'results': rows}


def item(item_id, price, state='São Paulo', condition='new', currency='BRL', **extra):
    return {
        'item_id': item_id,
        'price': price,
        'original_price': extra.pop('original_price', None),
        'currency_id': currency,
        'condition': condition,
        'seller_id': 123,
        'seller_address': {'city': {'id': 'opaco', 'name': 'Osasco'}, 'state': {'id': '', 'name': state}},
        **extra,
    }


L3250_SEARCH = {
    'paging': {'total': 3, 'offset': 0, 'limit': 50},
    'results': [
        {'id': 'MLB1', 'name': 'Impressora Epson EcoTank L3250', 'attributes': []},
        {'id': 'MLB2', 'name': 'Multifuncional Epson EcoTank', 'attributes': [{'id': 'MODEL', 'value_name': 'L-3250'}]},
        {'id': 'MLB3', 'name': 'Impressora Epson L4260', 'attributes': [{'id': 'MODEL', 'value_name': 'L4260'}]},
    ],
}


def mlb1_items(params):
    if params['offset'] == '0':
        return items_page([item('A', 899.9, original_price=999), item('B', 950, state='Santa Catarina')], 3)
    return items_page([item('C', 1000, condition='used', state='Atlântida')], 3, offset=2)


def mlb2_items(params):
    # A repete entre produtos de catálogo; D em dólar e E sem preço não são comparáveis.
    return items_page([item('A', 899.9), item('D', 100, currency='USD'), item('E', None)], 3)


def routes(**extra):
    return {
        '/sites/MLB/domain_discovery/search': (200, [{'domain_id': 'MLB-PRINTERS'}]),
        '/products/search': (200, L3250_SEARCH),
        '/products/MLB1/items': mlb1_items,
        '/products/MLB2/items': mlb2_items,
        **extra,
    }


@pytest.fixture
def credentials(monkeypatch):
    monkeypatch.setenv('ML_CLIENT_ID', 'app-de-teste')
    monkeypatch.setenv('ML_CLIENT_SECRET', SECRET)


def product(**extra):
    return TrackedProduct(**{'name': 'Impressora Epson L3250', 'model': 'L3250', 'brand': 'Epson', 'ean': '', **extra})


def connector(fake, sleep=None):
    # O "tempo" do teste avança pela espera falsa: dormir libera a vez da busca.
    return MercadoLivreConnector(transport=fake, sleep=sleep or (lambda _s: cache.delete(ml._SLOT_KEY)))


def search(conn, prod=None):
    return conn.search(prod or product(), seller_states=['SC'], destination_zip='88010000')


def test_without_credentials_is_unavailable_and_calls_nothing(monkeypatch):
    monkeypatch.delenv('ML_CLIENT_ID', raising=False)
    monkeypatch.delenv('ML_CLIENT_SECRET', raising=False)
    fake = FakeML(routes())
    result = search(connector(fake))
    assert result.status == SearchItemStatus.UNAVAILABLE and result.detail == ml.NOT_CONFIGURED
    assert fake.calls == []


def test_search_by_name_maps_offers_of_matching_catalog_products(credentials):
    fake = FakeML(routes())
    result = search(connector(fake))

    assert result.status == SearchItemStatus.DONE and result.detail == ml.COVERAGE
    searches = [call for call in fake.calls if call['path'] == '/products/search']
    assert searches[0]['params'] == {
        'site_id': 'MLB',
        'status': 'active',
        'limit': '50',
        'q': 'Epson L3250',
        'domain_id': 'MLB-PRINTERS',
    }
    # MLB3 (outro modelo) fica de fora; MLB1 casa pelo nome e MLB2 pelo atributo MODEL.
    assert '/products/MLB3/items' not in fake.paths()
    by_id = {offer.listing_id: offer for offer in result.offers}
    assert list(by_id) == ['A', 'B', 'C']  # A duplicada, D em dólar e E sem preço ficam de fora
    a = by_id['A']
    assert (a.price, a.original_price, a.condition) == (Decimal('899.90'), Decimal('999.00'), OfferCondition.NEW)
    assert (a.seller_id, a.seller_city, a.seller_state) == ('123', 'Osasco', 'SP')
    assert (a.catalog_product_id, a.title) == ('MLB1', 'Impressora Epson EcoTank L3250')
    assert a.invoice == InvoiceDeclaration.NOT_INFORMED and a.payment_condition == '' and a.url == ''
    assert a.shipping_cost is None and a.seller_name == ''  # frete e apelido ficam para a 3.3
    assert by_id['B'].seller_state == 'SC'
    assert by_id['C'].condition == OfferCondition.USED and by_id['C'].seller_state == ''  # estado desconhecido
    # Segunda página das ofertas só porque o total pedia.
    pages = [call['params']['offset'] for call in fake.calls if call['path'] == '/products/MLB1/items']
    assert pages == ['0', '2']


def test_ean_uses_product_identifier_without_model_filter(credentials):
    fake = FakeML(
        routes(
            **{
                '/products/search': (200, {'results': [{'id': 'MLB9', 'name': 'Outro nome'}]}),
                '/products/MLB9/items': items_page([item('X', 10)], 1),
            }
        )
    )
    result = search(connector(fake), product(ean='7891234567895'))
    assert [offer.listing_id for offer in result.offers] == ['X']
    searches = [call['params'] for call in fake.calls if call['path'] == '/products/search']
    assert len(searches) == 1 and searches[0]['product_identifier'] == '7891234567895' and 'q' not in searches[0]
    assert '/sites/MLB/domain_discovery/search' not in fake.paths()


def test_ean_without_result_falls_back_to_name_search(credentials):
    def products_search(params):
        return (200, {'results': []}) if 'product_identifier' in params else (200, L3250_SEARCH)

    fake = FakeML(routes(**{'/products/search': products_search}))
    result = search(connector(fake), product(ean='7891234567895'))
    assert {offer.listing_id for offer in result.offers} == {'A', 'B', 'C'}
    assert fake.paths().count('/products/search') == 2


def test_catalog_resolution_is_cached_and_next_search_only_reads_offers(credentials):
    fake = FakeML(routes())
    conn = connector(fake)
    search(conn)
    fake.calls.clear()
    search(conn)
    assert '/products/search' not in fake.paths() and '/sites/MLB/domain_discovery/search' not in fake.paths()
    assert '/oauth/token' not in fake.paths()  # token também em cache
    assert '/products/MLB1/items' in fake.paths()


def test_no_matching_catalog_product_is_done_without_offers(credentials):
    fake = FakeML(routes())
    result = search(connector(fake), product(name='Impressora Epson', model='L9999'))
    assert result.status == SearchItemStatus.DONE and result.offers == ()


def test_catalog_product_without_winners_has_no_offers(credentials):
    not_found = (404, {'message': 'No winners found', 'error': 'not_found', 'status': 404})
    fake = FakeML(routes(**{'/products/MLB1/items': not_found, '/products/MLB2/items': not_found}))
    result = search(connector(fake))
    assert result.status == SearchItemStatus.DONE and result.offers == ()


def test_busy_search_slot_waits_limited_time_then_is_unavailable(credentials):
    cache.set(ml._SLOT_KEY, 1, timeout=60)  # outra linha acabou de usar a busca
    now = [0.0]

    def sleep(seconds):
        now[0] += seconds

    fake = FakeML(routes())
    conn = MercadoLivreConnector(transport=fake, sleep=sleep, monotonic=lambda: now[0])
    result = search(conn)
    assert result.status == SearchItemStatus.UNAVAILABLE and result.detail == ml.RATE_LIMITED
    assert '/products/search' not in fake.paths()
    assert now[0] >= 10  # esperou no máximo a janela configurada


def test_rate_limited_api_is_unavailable_and_starts_cooldown(credentials):
    fake = FakeML(routes(**{'/products/search': (429, {'message': 'local_rate_limited', 'status': 429})}))
    result = search(connector(fake))
    assert result.status == SearchItemStatus.UNAVAILABLE and result.detail == ml.RATE_LIMITED
    assert cache.get(ml._SLOT_KEY) == 1  # quem vier depois espera o resfriamento


def test_token_is_renewed_once_after_401(credentials):
    answers = iter([(401, {'message': 'invalid_token'}), (200, [{'domain_id': 'MLB-PRINTERS'}])])
    fake = FakeML(routes(**{'/sites/MLB/domain_discovery/search': lambda _p: next(answers)}))
    result = search(connector(fake))
    assert result.status == SearchItemStatus.DONE
    assert fake.paths().count('/oauth/token') == 2


def test_rejected_credentials_are_unavailable_without_leaking_secret(credentials, caplog):
    caplog.set_level(logging.DEBUG)
    fake = FakeML(routes(**{'/oauth/token': (400, {'error': 'invalid_client'})}))
    result = search(connector(fake))
    assert result.status == SearchItemStatus.UNAVAILABLE and result.detail == ml.CREDENTIALS_REJECTED
    assert SECRET not in caplog.text and TOKEN not in caplog.text
    token_call = fake.calls[0]
    assert token_call['method'] == 'POST' and SECRET.encode() in token_call['body']  # só no corpo, nunca na URL
    assert all(SECRET not in call['path'] and SECRET not in str(call['params']) for call in fake.calls)


def test_bearer_token_goes_only_in_header(credentials):
    fake = FakeML(routes())
    search(connector(fake))
    gets = [call for call in fake.calls if call['method'] == 'GET']
    assert gets and all(call['headers']['Authorization'] == f'Bearer {TOKEN}' for call in gets)
    assert all(TOKEN not in str(call['params']) for call in gets)


@pytest.mark.parametrize('failure', ['server', 'network'])
def test_unexpected_failure_raises_without_secret(credentials, failure):
    if failure == 'server':
        fake = FakeML(routes(**{'/products/MLB1/items': (500, {'message': 'erro'})}))
    else:

        def fake(method, url, **_kwargs):
            if url.endswith('/oauth/token'):
                return 200, json.dumps({'access_token': TOKEN, 'expires_in': 21600}).encode()
            raise TimeoutError('timed out')

    with pytest.raises(MercadoLivreError) as error:
        search(connector(fake))
    assert SECRET not in str(error.value) and TOKEN not in str(error.value)


def test_domain_discovery_failure_only_drops_the_domain_filter(credentials):
    fake = FakeML(routes(**{'/sites/MLB/domain_discovery/search': (500, {'message': 'erro'})}))
    result = search(connector(fake))
    params = next(call['params'] for call in fake.calls if call['path'] == '/products/search')
    assert 'domain_id' not in params and result.status == SearchItemStatus.DONE


def test_queries_cascade_brand_model_then_name_model():
    assert ml._queries(product(name='Impressora multifuncional', brand='Epson', model='L3250')) == [
        'Epson L3250',
        'Impressora multifuncional L3250',
    ]
    assert ml._queries(product(name='Impressora multifuncional', brand='', model='L3250')) == [
        'Impressora multifuncional L3250'
    ]
    assert ml._queries(product(name='Celular Galaxy S24 SM-S921B', brand='', model='sm s921b')) == [
        'Celular Galaxy S24 SM-S921B'
    ]


def test_name_query_runs_only_when_brand_and_model_find_no_match(credentials):
    def products_search(params):
        if params['q'] == 'Epson L3250':
            return 200, {'results': [{'id': 'MLB3', 'name': 'Impressora Epson L4260', 'attributes': []}]}
        return 200, L3250_SEARCH

    fake = FakeML(routes(**{'/products/search': products_search}))
    result = search(connector(fake))
    queries = [call['params']['q'] for call in fake.calls if call['path'] == '/products/search']
    assert queries == ['Epson L3250', 'Impressora Epson L3250']
    assert {offer.listing_id for offer in result.offers} == {'A', 'B', 'C'}


def test_other_codes_other_brands_and_other_capacities_are_left_out(credentials):
    rows = [
        {
            'id': 'S24',
            'name': 'Samsung Galaxy S24 256GB Preto S921b',
            'attributes': [{'id': 'BRAND', 'value_name': 'Samsung'}],
        },
        {'id': 'FE', 'name': 'Samsung Galaxy S24 Fe 256gb SM-S721B', 'attributes': []},
        {'id': 'OUTRA', 'name': 'Capa S921b 256GB', 'attributes': [{'id': 'BRAND', 'value_name': 'KawaSkin'}]},
        {'id': '128', 'name': 'Samsung Galaxy S24 128GB S921b', 'attributes': []},
    ]
    fake = FakeML(
        routes(**{'/products/search': (200, {'results': rows}), '/products/S24/items': items_page([item('X', 10)], 1)})
    )
    s24 = product(name='Smartphone Galaxy S24 256GB', model='SM-S921B', brand='Samsung')
    result = search(connector(fake), s24)
    assert [offer.catalog_product_id for offer in result.offers] == ['S24']
    assert not {'/products/FE/items', '/products/OUTRA/items', '/products/128/items'} & set(fake.paths())


def test_family_siblings_join_when_brand_and_capacity_pass(credentials):
    rows = [
        {'id': 'MLB1', 'name': 'Celular Samsung Galaxy S24 128gb S921b Cor Creme', 'parent_id': 'P1', 'attributes': []}
    ]
    family = {'id': 'P1', 'children_ids': ['MLB1', 'MLB2', 'MLB3', 'MLB4']}
    fake = FakeML(
        routes(
            **{
                '/products/search': (200, {'results': rows}),
                '/products/P1': (200, family),
                '/products/MLB2': (200, {'id': 'MLB2', 'name': 'Samsung Galaxy S24 128gb cor amarela'}),
                '/products/MLB3': (
                    200,
                    {
                        'id': 'MLB3',
                        'name': 'Capa Galaxy S24',
                        'attributes': [{'id': 'BRAND', 'value_name': 'KawaSkin'}],
                    },
                ),
                '/products/MLB4': (404, {'message': 'not found'}),
                '/products/MLB1/items': items_page([], 0),
                '/products/MLB2/items': items_page([item('Y', 3999)], 1),
            }
        )
    )
    result = search(connector(fake), product(name='Smartphone Galaxy S24', model='SM-S921B', brand='Samsung'))
    assert [(offer.listing_id, offer.catalog_product_id) for offer in result.offers] == [('Y', 'MLB2')]
    assert '/products/MLB3/items' not in fake.paths()  # outra marca na família


def test_app_registers_the_real_connector():
    PricingConfig.ready(PricingConfig.__new__(PricingConfig))
    assert isinstance(sources.connector_for('mercado_livre'), MercadoLivreConnector)
