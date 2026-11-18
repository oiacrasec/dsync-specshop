"""Conector do Mercado Livre pela API oficial de catálogo (ADR 2002, etapas 3.1 e 3.2).

Fluxo por produto (decisões 10–15 e 16–22 do plano 2001):

1. Token da aplicação (`client_credentials`) em cache até perto de expirar.
2. Produtos de catálogo em cascata (ADR 2001): EAN por `product_identifier`; senão marca +
   modelo; senão nome + modelo, no domínio previsto por `domain_discovery`. Para na primeira
   consulta com produto que corresponda (`matching.py`: modelo como palavra inteira, marca e
   capacidade). Os irmãos da família (`parent_id`) entram quando passam por marca e
   capacidade, porque o catálogo escreve o modelo de jeitos diferentes ("SM-S921B" ×
   "Galaxy S24") e a família reúne só variações do mesmo aparelho.
3. Ofertas de cada produto de catálogo em `/products/{id}/items`.

`/products/search` aceita ~1 chamada a cada 10 s: a vez é reservada no cache, a espera é
limitada e, sem vez ou com 429, a linha fica "fonte indisponível" para nova tentativa. O
resultado da busca fica em cache, então pesquisas seguintes do produto só consultam ofertas.
Frete por CEP, apelido do vendedor e filtro de UF ficam para a 3.3; nada é inventado.
"""

import hashlib
import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation

from django.core.cache import cache

from . import constants as c
from . import matching
from .models import CollectionMechanism, InvoiceDeclaration, OfferCondition, SearchItemStatus
from .sources import SourceOffer, SourceResult, unavailable

logger = logging.getLogger(__name__)

NOT_CONFIGURED = 'O Mercado Livre não está configurado no servidor.'
CREDENTIALS_REJECTED = 'O Mercado Livre recusou as credenciais do SPECSHOP.'
RATE_LIMITED = 'O Mercado Livre limitou as consultas agora. Tente de novo em alguns segundos.'
COVERAGE = 'Ofertas de produtos do catálogo do Mercado Livre; anúncios fora do catálogo não entram.'

_CONDITIONS = {'new': OfferCondition.NEW, 'used': OfferCondition.USED, 'refurbished': OfferCondition.REFURBISHED}
_TOKEN_KEY = 'pricing:ml:token'  # noqa: S105 (chave de cache, não o token)
_SLOT_KEY = 'pricing:ml:search-slot'
_CATALOG_KEY = 'pricing:ml:catalog:'
_CENT = Decimal('0.01')


class MercadoLivreError(Exception):
    """Resposta inesperada da API; a mensagem nunca leva credenciais ou token."""


class _RateLimited(Exception):
    pass


class _CredentialsRejected(Exception):
    pass


def urllib_transport(method, url, *, headers, body, timeout):
    """Transporte HTTP padrão (biblioteca padrão, sem dependência nova). Devolve (status, bytes)."""
    request = urllib.request.Request(url, data=body, headers=headers, method=method)  # noqa: S310 (URL fixa https)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


class MercadoLivreConnector:
    source = c.ML_SOURCE
    mechanism = CollectionMechanism.SERVER

    def __init__(self, transport=urllib_transport, sleep=time.sleep, monotonic=time.monotonic):
        self._transport = transport
        self._sleep = sleep
        self._monotonic = monotonic

    def search(self, product, *, seller_states, destination_zip):
        credentials = _credentials()
        if credentials is None:
            return unavailable(NOT_CONFIGURED)
        try:
            catalog = self._catalog_products(product, credentials)
            offers = self._offers(catalog, credentials)
        except _RateLimited:
            return unavailable(RATE_LIMITED)
        except _CredentialsRejected:
            return unavailable(CREDENTIALS_REJECTED)
        return SourceResult(status=SearchItemStatus.DONE, offers=tuple(offers), detail=COVERAGE)

    # Produtos de catálogo -------------------------------------------------------------------

    def _catalog_products(self, product, credentials):
        """Lista de (id, nome) dos produtos de catálogo do produto, com cache."""
        queries = _queries(product)
        ean = (product.ean or '').strip()
        identity = '|'.join([ean, product.name, product.model, product.brand or '', *queries])
        key = _CATALOG_KEY + hashlib.sha256(identity.upper().encode()).hexdigest()
        cached = cache.get(key)
        if cached is not None:
            return cached
        found = []
        if ean:
            found = [(row['id'], row.get('name', '')) for row in self._search({'product_identifier': ean}, credentials)]
        domain = None
        for query in queries:
            if found:
                break
            if domain is None:
                domain = self._domain(query, credentials)
            params = {'q': query, **({'domain_id': domain} if domain else {})}
            rows = self._search(params, credentials)
            found = [(row['id'], row.get('name', '')) for row in rows if _matches(row, product)]
            if found:
                found = self._with_family(rows, found, product, credentials)
        found = found[: c.ML_MAX_CATALOG_PRODUCTS]
        cache.set(key, found, c.ML_CATALOG_CACHE_SECONDS if found else c.ML_CATALOG_MISS_CACHE_SECONDS)
        return found

    def _with_family(self, rows, found, product, credentials):
        """Acrescenta irmãos de família (`parent_id`) dos produtos que corresponderam.

        Verificado em 18/11: a família reúne variações do mesmo aparelho (S24 128 GB creme e
        amarela; L3250 com e sem Wi-Fi). Irmão entra se passar por marca e capacidade.
        """
        known = {catalog_id for catalog_id, _name in found}
        by_id = {row['id']: row for row in rows}
        parents = list(dict.fromkeys(by_id[catalog_id].get('parent_id') for catalog_id in known if catalog_id in by_id))
        for parent in filter(None, parents):
            if len(found) >= c.ML_MAX_CATALOG_PRODUCTS:
                break
            status, family = self._get(f'/products/{_quote(parent)}', {}, credentials)
            if status != 200:
                continue
            for child in family.get('children_ids') or []:
                if child in known or len(found) >= c.ML_MAX_CATALOG_PRODUCTS:
                    continue
                row = by_id.get(child)
                if row is None:
                    status, row = self._get(f'/products/{_quote(child)}', {}, credentials)
                    if status != 200:
                        continue
                if _family_member_matches(row, product):
                    found.append((child, row.get('name', '')))
                    known.add(child)
        return found

    def _domain(self, query, credentials):
        """Domínio previsto pelo próprio Mercado Livre; falha aqui só tira o filtro."""
        try:
            status, data = self._get('/sites/MLB/domain_discovery/search', {'q': query, 'limit': 1}, credentials)
        except MercadoLivreError:
            return ''
        if status != 200 or not isinstance(data, list) or not data:
            return ''
        return data[0].get('domain_id') or ''

    def _search(self, params, credentials):
        self._take_search_slot()
        status, data = self._get(
            '/products/search',
            {'site_id': c.ML_SITE_ID, 'status': 'active', 'limit': c.ML_SEARCH_PAGE_SIZE, **params},
            credentials,
        )
        if status == 404:
            return []
        if status != 200:
            raise MercadoLivreError(f'/products/search respondeu {status}.')
        return [row for row in data.get('results', []) if row.get('id')]

    def _take_search_slot(self):
        """Reserva a vez de usar a busca (uma a cada 10 s no cache); espera limitada."""
        deadline = self._monotonic() + c.ML_SEARCH_SLOT_WAIT_SECONDS
        while not cache.add(_SLOT_KEY, 1, timeout=c.ML_SEARCH_INTERVAL_SECONDS):
            if self._monotonic() >= deadline:
                raise _RateLimited()
            self._sleep(0.5)

    # Ofertas ---------------------------------------------------------------------------------

    def _offers(self, catalog, credentials):
        offers, seen = [], set()
        for catalog_id, name in catalog:
            for row in self._catalog_items(catalog_id, credentials):
                offer = _offer(row, catalog_id=catalog_id, title=name)
                if offer is not None and offer.listing_id not in seen:
                    seen.add(offer.listing_id)
                    offers.append(offer)
        return offers

    def _catalog_items(self, catalog_id, credentials):
        path = f'/products/{_quote(catalog_id)}/items'
        offset = 0
        for _page in range(c.ML_MAX_OFFER_PAGES):
            status, data = self._get(path, {'limit': c.ML_OFFERS_PAGE_SIZE, 'offset': offset}, credentials)
            if status == 404:  # "No winners found": produto de catálogo sem ofertas ativas
                return
            if status != 200:
                raise MercadoLivreError(f'/products/{{id}}/items respondeu {status}.')
            results = data.get('results') or []
            yield from results
            offset += len(results)
            total = (data.get('paging') or {}).get('total') or 0
            if not results or offset >= total:
                return

    # HTTP e token ----------------------------------------------------------------------------

    def _get(self, path, params, credentials, *, renewed=False):
        url = f'{c.ML_API_URL}{path}?{urllib.parse.urlencode(params)}'
        token = self._token(credentials)
        status, data = self._call('GET', url, headers={'Authorization': f'Bearer {token}'})
        if status == 401 and not renewed:
            cache.delete(_token_key(credentials))
            return self._get(path, params, credentials, renewed=True)
        if status == 401:
            raise _CredentialsRejected()
        return status, data

    def _token(self, credentials):
        key = _token_key(credentials)
        token = cache.get(key)
        if token:
            return token
        client_id, client_secret = credentials
        body = urllib.parse.urlencode(
            {'grant_type': 'client_credentials', 'client_id': client_id, 'client_secret': client_secret}
        ).encode()
        status, data = self._call(
            'POST',
            f'{c.ML_API_URL}/oauth/token',
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            body=body,
        )
        if status in (400, 401, 403):
            logger.warning('Mercado Livre recusou o token da aplicação (HTTP %s).', status)
            raise _CredentialsRejected()
        if status != 200 or not data.get('access_token'):
            raise MercadoLivreError(f'/oauth/token respondeu {status}.')
        lifetime = int(data.get('expires_in') or 0) - c.ML_TOKEN_RENEW_MARGIN_SECONDS
        if lifetime > 0:
            cache.set(key, data['access_token'], lifetime)
        return data['access_token']

    def _call(self, method, url, *, headers, body=None):
        headers = {'Accept': 'application/json', **headers}
        try:
            status, raw = self._transport(method, url, headers=headers, body=body, timeout=c.ML_REQUEST_TIMEOUT_SECONDS)
        except (OSError, TimeoutError) as error:
            raise MercadoLivreError(f'Falha de rede ao chamar o Mercado Livre: {type(error).__name__}.') from None
        if status == 429:
            # A API limita a busca; quem vier depois espera o resfriamento em vez de insistir.
            cache.set(_SLOT_KEY, 1, timeout=c.ML_RATE_LIMIT_COOLDOWN_SECONDS)
            raise _RateLimited()
        try:
            data = json.loads(raw) if raw else {}
        except ValueError:
            raise MercadoLivreError(f'Resposta não JSON do Mercado Livre (HTTP {status}).') from None
        return status, data


# Funções puras ------------------------------------------------------------------------------


def _credentials():
    client_id = os.environ.get(c.ML_CLIENT_ID_ENV, '').strip()
    client_secret = os.environ.get(c.ML_CLIENT_SECRET_ENV, '').strip()
    return (client_id, client_secret) if client_id and client_secret else None


def _token_key(credentials):
    # O id da aplicação entra só como hash: trocar a aplicação descarta o token antigo.
    return f'{_TOKEN_KEY}:{hashlib.sha256(credentials[0].encode()).hexdigest()[:16]}'


def _quote(catalog_id):
    return urllib.parse.quote(str(catalog_id), safe='')


def _queries(product):
    """Cascata de consultas (ADR 2001, revisão de 18/11): marca + modelo, depois nome + modelo.

    Medido em 2026-11-18: "Epson L3250" achou 25 produtos de catálogo da L3250 em 50, e
    "Impressora Epson L3250" (nome cadastrado) só 1. O nome continua como consulta de reserva
    (D-24); o EAN, quando existe, vem antes de todas.
    """
    model = product.model.strip()
    brand = (product.brand or '').strip()
    name = product.name.strip()
    by_name = name if matching.compact(model) in matching.compact(name) else f'{name} {model}'
    queries = [f'{brand} {model}'] if brand else []
    if by_name.casefold() not in (query.casefold() for query in queries):
        queries.append(by_name)
    return queries


def _attribute(row, attribute_id):
    return [attr.get('value_name') or '' for attr in row.get('attributes') or [] if attr.get('id') == attribute_id]


def _source_text(row):
    """Nome + valores dos atributos: onde a capacidade pode aparecer ("256 GB")."""
    values = [attr.get('value_name') or '' for attr in row.get('attributes') or []]
    return ' '.join([row.get('name', ''), *values])


def _brand_and_capacity_match(row, product):
    brands = _attribute(row, 'BRAND') or ['']
    return any(matching.brand_matches(product.brand, brand) for brand in brands) and matching.capacity_matches(
        product, _source_text(row)
    )


def _matches(row, product):
    """Produto de catálogo corresponde: modelo (nome ou MODEL), marca e capacidade."""
    texts = [row.get('name', ''), *_attribute(row, 'MODEL')]
    if not any(matching.model_matches(text, product.model) for text in texts):
        return False
    return _brand_and_capacity_match(row, product)


def _family_member_matches(row, product):
    """Irmão de família: sem exigir o código do modelo; marca e capacidade ainda valem."""
    return _brand_and_capacity_match(row, product)


def _decimal(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        number = Decimal(str(value)).quantize(_CENT)
    except InvalidOperation:
        return None
    return number if number.is_finite() else None


def _state(address):
    name = ((address or {}).get('state') or {}).get('name') or ''
    return c.BRAZIL_STATE_BY_NAME.get(matching.plain(name).strip(), '')


def _offer(row, *, catalog_id, title):
    """Converte a oferta; sem ID, sem preço ou em outra moeda ela não é comparável e fica de fora."""
    listing_id = str(row.get('item_id') or '')
    price = _decimal(row.get('price'))
    if not listing_id or price is None or row.get('currency_id') != c.ML_CURRENCY:
        return None
    address = row.get('seller_address') or {}
    return SourceOffer(
        listing_id=listing_id[:64],
        price=price,
        title=(title or '')[:255],
        catalog_product_id=catalog_id[:64],
        original_price=_decimal(row.get('original_price')),
        condition=_CONDITIONS.get(row.get('condition'), OfferCondition.UNKNOWN),
        invoice=InvoiceDeclaration.NOT_INFORMED,
        seller_id=str(row.get('seller_id') or '')[:64],
        seller_city=((address.get('city') or {}).get('name') or '')[:120],
        seller_state=_state(address),
    )
