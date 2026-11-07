"""Gravação na base global de preços (ADR 2003 §2 e §3)."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, OuterRef, Subquery
from django.utils import timezone

from .models import CollectionMechanism, ObservationOrigin, PriceObservation
from .partitions import ensure_partitions


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
        PriceObservation.objects.bulk_create(
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
        ObservationOrigin.objects.bulk_create(
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
