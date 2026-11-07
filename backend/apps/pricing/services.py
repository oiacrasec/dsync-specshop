"""Pesquisa sob demanda e gravação na base global de preços (ADR 2003 §2 a §4)."""

import logging
import statistics
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Count, OuterRef, Subquery
from django.utils import timezone

from .constants import STALE_RUN_SECONDS
from .exceptions import SearchItemNotRunnable
from .models import (
    CollectionMechanism,
    ObservationOrigin,
    OfferCondition,
    PriceObservation,
    PriceSearchItem,
    SearchItemStatus,
    SearchOffer,
)
from .partitions import ensure_partitions
from .sources import connector_for, unavailable

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')
RETRYABLE = (SearchItemStatus.UNAVAILABLE, SearchItemStatus.ERROR)
NO_CONNECTOR = 'O conector desta fonte ainda não está disponível.'
SOURCE_FAILED = 'A fonte não respondeu como esperado. Tente de novo mais tarde.'


def run_item(item_id, *, retry, user):
    """Pesquisa um produto numa fonte: uma requisição por linha, sem fila (ADR 2003 §4).

    1) Marca a linha como "pesquisando" sob lock (duas execuções não rodam em dobro).
    2) Chama o conector fora da transação, porque a fonte externa é lenta.
    3) Grava ofertas, fotografia dos indicadores e base global numa transação curta.
    """
    item = _claim(item_id, retry=retry)
    connector = connector_for(item.source)
    mechanism = getattr(connector, 'mechanism', CollectionMechanism.SERVER)
    try:
        search = item.search
        result = (
            connector.search(item.product, seller_states=search.seller_states, destination_zip=search.destination_zip)
            if connector is not None
            else unavailable(NO_CONNECTOR)
        )
    except Exception:
        logger.exception('Falha do conector %s no item %s.', item.source, item.public_id)
        result = None
    with transaction.atomic():
        item = PriceSearchItem.objects.select_for_update().get(pk=item.pk)
        if result is None:
            _finish(item, SearchItemStatus.ERROR, detail=SOURCE_FAILED)
        else:
            _store_result(item, result, mechanism=mechanism, user=user)
    return item


def _claim(item_id, *, retry):
    with transaction.atomic():
        item = PriceSearchItem.objects.select_for_update().select_related('search', 'product').get(pk=item_id)
        stale = (
            item.status == SearchItemStatus.RUNNING
            and item.started_at is not None
            and item.started_at < timezone.now() - timedelta(seconds=STALE_RUN_SECONDS)
        )
        allowed = item.status in RETRYABLE or stale if retry else item.status == SearchItemStatus.PENDING
        if not allowed:
            raise SearchItemNotRunnable()
        item.status = SearchItemStatus.RUNNING
        item.started_at = timezone.now()
        item.detail = ''
        item.save(update_fields=['status', 'started_at', 'detail', 'updated_at'])
    return item


def _store_result(item, result, *, mechanism, user):
    if result.status != SearchItemStatus.DONE:
        _finish(item, result.status, detail=result.detail)
        return
    now = timezone.now()
    offers = [_offer(item, offer, mechanism=mechanism, observed_at=now) for offer in result.offers]
    SearchOffer.objects.bulk_create(offers)
    eligible = [offer for offer in offers if offer.eligible]
    if not eligible:
        _finish(item, SearchItemStatus.NO_RESULTS, detail=result.detail)
        return
    prices = sorted(offer.price for offer in eligible)
    item.offer_count = len(prices)
    item.min_price, item.max_price = prices[0], prices[-1]
    item.median_price = Decimal(statistics.median(prices)).quantize(CENT, rounding=ROUND_HALF_UP)
    item.avg_price = (sum(prices) / len(prices)).quantize(CENT, rounding=ROUND_HALF_UP)
    _finish(
        item,
        SearchItemStatus.DONE,
        detail=result.detail,
        stats=['offer_count', 'min_price', 'max_price', 'median_price', 'avg_price'],
    )
    record_observations(
        [
            ObservedOffer(
                source=item.source,
                listing_id=offer.listing_id,
                price=offer.price,
                catalog_product_id=offer.catalog_product_id,
            )
            for offer in eligible
        ],
        mechanism=mechanism,
        search_item=item,
        user=user,
    )


def _offer(item, offer, *, mechanism, observed_at):
    # Elegibilidade básica da 2.2: produto novo e preço positivo. A regra completa vem na 3.2.
    if offer.condition != OfferCondition.NEW:
        reason = 'not_new'
    elif offer.price is None or offer.price <= 0:
        reason = 'invalid_price'
    else:
        reason = ''
    return SearchOffer(
        item=item,
        contract_id=item.contract_id,
        organization_id=item.organization_id,
        mechanism=mechanism,
        listing_id=offer.listing_id,
        catalog_product_id=offer.catalog_product_id,
        title=offer.title,
        url=offer.url,
        price=offer.price,
        original_price=offer.original_price,
        payment_condition=offer.payment_condition,
        condition=offer.condition,
        invoice=offer.invoice,
        seller_id=offer.seller_id,
        seller_name=offer.seller_name,
        seller_city=offer.seller_city,
        seller_state=offer.seller_state,
        shipping_cost=offer.shipping_cost,
        delivery_date=offer.delivery_date,
        observed_at=observed_at,
        eligible=not reason,
        ineligible_reason=reason,
    )


def _finish(item, status, *, detail='', stats=()):
    item.status = status
    item.detail = detail[:255]
    item.finished_at = timezone.now()
    item.save(update_fields=['status', 'detail', 'finished_at', 'updated_at', *stats])


@dataclass(frozen=True)
class ObservedOffer:
    """Oferta pública como vai para a base global: só o que é público na fonte."""

    source: str
    listing_id: str
    price: Decimal
    catalog_product_id: str = ''
    observed_on: date | None = None


def record_observations(offers, *, mechanism, search_item, user=None):
    """Grava as ofertas de uma linha de pesquisa na base global, em comandos constantes.

    1 INSERT das observações (repetição ignorada), 1 UPDATE de "vista pelo servidor" quando a
    coleta é do servidor, 1 INSERT das origens e 1 UPDATE das empresas que enviaram. O número
    de comandos não cresce com o número de ofertas; o DDL de partição só roda na virada do mês.
    """
    if not offers:
        return 0
    today = timezone.localdate()
    rows = {}
    for offer in offers:
        day = offer.observed_on or today
        key = (offer.source, offer.listing_id, day, offer.price)
        rows.setdefault(key, offer)
    ensure_partitions({key[2] for key in rows})
    server = mechanism == CollectionMechanism.SERVER
    with transaction.atomic():
        # Escrita global explícita: a base é de todos e não pertence ao contexto da requisição.
        PriceObservation.objects.unscoped().bulk_create(
            [
                PriceObservation(
                    source=source,
                    listing_id=listing_id,
                    observed_on=day,
                    price=price,
                    catalog_product_id=offer.catalog_product_id,
                    mechanism=mechanism,
                    server_confirmed=server,
                )
                for (source, listing_id, day, price), offer in rows.items()
            ],
            ignore_conflicts=True,
        )
        if server:
            PriceObservation.objects.unscoped().filter(pk__in=list(rows), server_confirmed=False).update(
                server_confirmed=True
            )
        ObservationOrigin.objects.unscoped().bulk_create(
            [
                ObservationOrigin(
                    source=source,
                    listing_id=listing_id,
                    observed_on=day,
                    price=price,
                    mechanism=mechanism,
                    contract_id=search_item.contract_id,
                    organization_id=search_item.organization_id,
                    user=user,
                    search_item=search_item,
                )
                for source, listing_id, day, price in rows
            ],
            ignore_conflicts=True,
        )
        _refresh_confirmed_contracts(rows)
    return len(rows)


def _refresh_confirmed_contracts(keys):
    """Recalcula, num único UPDATE, quantas empresas distintas enviaram cada observação."""
    contracts = (
        ObservationOrigin.objects.unscoped()
        .filter(
            source=OuterRef('source'),
            listing_id=OuterRef('listing_id'),
            observed_on=OuterRef('observed_on'),
            price=OuterRef('price'),
        )
        .order_by()
        .values('source')
        .annotate(total=Count('contract', distinct=True))
        .values('total')
    )
    PriceObservation.objects.unscoped().filter(pk__in=list(keys)).update(confirmed_contracts=Subquery(contracts))
