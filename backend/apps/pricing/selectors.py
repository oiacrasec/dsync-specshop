"""Leituras da base global de preços."""

from datetime import datetime, time

from django.db.models import Avg, Count, Exists, Max, Min, OuterRef, Q
from django.utils import timezone

from .aggregates import Median
from .models import PriceObservation, PriceSearchItem
from .utils import browser_confirmations


def searches_using_product(queryset, term):
    """Correlaciona itens da pesquisa sem multiplicar pesquisas ou consultar por linha."""
    items = PriceSearchItem.objects.filter(search_id=OuterRef('pk')).filter(
        Q(product__name__icontains=term) | Q(product__model__icontains=term)
    )
    return queryset.filter(Exists(items))


def searches_on_dates(queryset, *, date_from=None, date_to=None, time_zone):
    """Dias completos no fuso do usuário, com limites no timestamp sem cast na coluna."""
    limits = {}
    if date_from:
        limits['created_at__gte'] = timezone.make_aware(datetime.combine(date_from, time.min), time_zone)
    if date_to:
        limits['created_at__lte'] = timezone.make_aware(datetime.combine(date_to, time.max), time_zone)
    return queryset.filter(**limits)


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
