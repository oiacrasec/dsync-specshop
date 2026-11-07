"""Leituras da base global de preços."""

from django.db.models import Avg, Count, Max, Min, Q

from .aggregates import Median
from .models import PriceObservation
from .utils import browser_confirmations


def price_series(catalog_product_ids, since, until):
    """Indicadores por dia dos produtos do catálogo, numa única consulta (ADR 2003 §2).

    Leitura global explícita (`unscoped()`): o histórico é de todos, e a tabela não guarda
    quem pesquisou. Entra só observação fora de quarentena, vista pelo servidor ou enviada
    por empresas suficientes. Dias sem observação não aparecem: a tela mostra lacuna.
    """
    trusted = Q(server_confirmed=True) | Q(confirmed_contracts__gte=browser_confirmations())
    return list(
        PriceObservation.objects.unscoped()
        .filter(
            trusted, catalog_product_id__in=catalog_product_ids, observed_on__range=(since, until), quarantined=False
        )
        .values('observed_on')
        .annotate(
            min_price=Min('price'),
            median_price=Median('price'),
            avg_price=Avg('price'),
            max_price=Max('price'),
            offer_count=Count('*'),
        )
        .order_by('observed_on')
    )
