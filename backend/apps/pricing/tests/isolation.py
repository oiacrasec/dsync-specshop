"""Fábricas de isolamento da pesquisa de preços, carregadas por apps/core/tests/test_isolation.py."""

from datetime import date
from decimal import Decimal
from itertools import count

from apps.catalog.models import TrackedProduct
from apps.pricing.models import ObservationOrigin, PriceObservation, PriceSearch, PriceSearchItem, SearchOffer
from apps.pricing.partitions import ensure_partitions

_sequence = count()


def make_search(contract, organization):
    return PriceSearch.objects.create(contract=contract, organization=organization, sources=['mercado_livre'])


def make_item(contract, organization):
    product = TrackedProduct.objects.create(name=f'produto-{next(_sequence)}', model='M1', contract=contract)
    return PriceSearchItem.objects.create(
        search=make_search(contract, organization),
        product=product,
        source='mercado_livre',
        contract=contract,
        organization=organization,
    )


def make_offer(contract, organization):
    return SearchOffer.objects.create(
        item=make_item(contract, organization),
        mechanism='server',
        listing_id=f'MLB{next(_sequence)}',
        price=Decimal('10.00'),
        contract=contract,
        organization=organization,
    )


def make_observation(world):
    ensure_partitions([date(2026, 11, 7)])
    PriceObservation.objects.create(
        source='mercado_livre',
        listing_id=f'MLB{next(_sequence)}',
        observed_on=date(2026, 11, 7),
        price=Decimal('10.00'),
        mechanism='server',
    )


def make_origin(world):
    contract, organization = world['a']['contract'], world['a']['main']
    ObservationOrigin.objects.create(
        source='mercado_livre',
        listing_id='MLB1',
        observed_on=date(2026, 11, 7),
        price=Decimal('10.00'),
        mechanism='server',
        contract=contract,
        organization=organization,
        search_item=make_item(contract, organization),
    )


FACTORIES = {
    PriceSearch: make_search,
    PriceSearchItem: make_item,
    SearchOffer: make_offer,
}
GLOBAL_ONLY = {
    PriceObservation: make_observation,
    ObservationOrigin: make_origin,
}
