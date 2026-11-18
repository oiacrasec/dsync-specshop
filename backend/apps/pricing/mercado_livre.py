"""Conector do Mercado Livre pela API oficial de catálogo (ADR 2002, etapa 3.1).

Fluxo por produto (decisões da 3.1 no plano 2001):

1. Token da aplicação (`client_credentials`) em cache até perto de expirar.
2. Produtos de catálogo: com EAN, `product_identifier` (prioridade da documentação); sem
   resultado, `q` = marca + modelo com o domínio previsto por `domain_discovery`. Só ficam os produtos cujo
   nome ou atributo MODEL contém o modelo cadastrado; a correspondência fina é da 3.2.
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
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation

from django.core.cache import cache

from . import constants as c
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
        query = _query(product)
        ean = (product.ean or '').strip()
        key = _CATALOG_KEY + hashlib.sha256(f'{ean}|{query}|{product.model}'.upper().encode()).hexdigest()
        cached = cache.get(key)
        if cached is not None:
            return cached
        found = []
        if ean:
            found = [(row['id'], row.get('name', '')) for row in self._search({'product_identifier': ean}, credentials)]
        if not found:
            params = {'q': query}
            domain = self._domain(query, credentials)
            if domain:
                params['domain_id'] = domain
            found = [
                (row['id'], row.get('name', ''))
                for row in self._search(params, credentials)
                if _matches_model(row, product.model)
            ]
        found = found[: c.ML_MAX_CATALOG_PRODUCTS]
        cache.set(key, found, c.ML_CATALOG_CACHE_SECONDS if found else c.ML_CATALOG_MISS_CACHE_SECONDS)
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
        path = f'/products/{urllib.parse.quote(catalog_id, safe="")}/items'
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


def _query(product):
    """Marca + modelo; sem marca, nome + modelo.

    Medido em 2026-11-18: "Epson L3250" achou 25 produtos de catálogo da L3250 em 50, e
    "Impressora Epson L3250" (nome cadastrado) só 1; palavras genéricas pioram a busca.
    """
    model = product.model.strip()
    brand = (product.brand or '').strip()
    if brand:
        return f'{brand} {model}'
    name = product.name.strip()
    return name if _compact(model) in _compact(name) else f'{name} {model}'


def _compact(text):
    """Só letras e dígitos, sem acento, em maiúsculas: 'SM-S921B' e 'sm s921b' ficam iguais."""
    text = unicodedata.normalize('NFKD', text or '').encode('ascii', 'ignore').decode()
    return re.sub(r'[^0-9A-Za-z]', '', text).upper()


def _matches_model(row, model):
    """Filtro mínimo da 3.1: o modelo cadastrado aparece no nome ou no MODEL do catálogo."""
    wanted = _compact(model)
    if not wanted:
        return False
    models = [attr.get('value_name') or '' for attr in row.get('attributes') or [] if attr.get('id') == 'MODEL']
    return any(wanted in _compact(text) for text in [row.get('name', ''), *models])


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
    plain = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().upper().strip()
    return c.BRAZIL_STATE_BY_NAME.get(plain, '')


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
