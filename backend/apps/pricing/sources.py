"""Contrato dos conectores de fonte (ADR 2001, ADR 2003 §3 e §4).

Cada fonte implementa `search` e se registra em `CONNECTORS`. Fonte sem conector registrado
responde "indisponível": nunca se simula uma fonte conectada (plano 2001, decisão 3). O
conector do Mercado Livre entra na etapa 3.1.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Protocol

from .models import CollectionMechanism, InvoiceDeclaration, OfferCondition, SearchItemStatus


@dataclass(frozen=True)
class SourceOffer:
    """Oferta como a fonte devolve; valor ausente fica vazio ou nulo, nunca zero."""

    listing_id: str
    price: Decimal
    title: str = ''
    url: str = ''
    catalog_product_id: str = ''
    original_price: Decimal | None = None
    payment_condition: str = ''
    condition: str = OfferCondition.UNKNOWN
    invoice: str = InvoiceDeclaration.NOT_INFORMED
    seller_id: str = ''
    seller_name: str = ''
    seller_city: str = ''
    seller_state: str = ''
    shipping_cost: Decimal | None = None
    delivery_date: date | None = None


@dataclass(frozen=True)
class SourceResult:
    status: str
    offers: tuple[SourceOffer, ...] = field(default=())
    detail: str = ''


class SourceConnector(Protocol):
    source: str
    mechanism: str = CollectionMechanism.SERVER

    def search(self, product, *, seller_states, destination_zip) -> SourceResult: ...


CONNECTORS: dict[str, SourceConnector] = {}


def connector_for(source):
    return CONNECTORS.get(source)


def unavailable(detail):
    return SourceResult(status=SearchItemStatus.UNAVAILABLE, detail=detail)
