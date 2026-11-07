from datetime import date
from decimal import Decimal

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.contracts.models import Contract, Organization
from apps.core.tenancy import TenantContextMissing, use_context
from apps.pricing.models import ObservationOrigin, PriceObservation
from apps.pricing.partitions import ensure_partitions, forget_ensured_partitions, partition_name
from apps.pricing.selectors import price_series
from apps.pricing.services import ObservedOffer, record_observations
from apps.pricing.tests.isolation import make_item

pytestmark = pytest.mark.django_db
DAY = date(2026, 11, 7)
ML = 'mercado_livre'


@pytest.fixture(autouse=True)
def fresh_partition_memory():
    # Cada teste roda numa transação desfeita: a memória do processo não pode sobreviver a ela.
    forget_ensured_partitions()
    yield
    forget_ensured_partitions()


def company(name):
    contract = Contract.objects.create(name=name, start_date=date(2020, 1, 1), licenses=5)
    organization = Organization.objects.create(name=f'{name} Centro', contract=contract)
    return make_item(contract, organization)


def offer(listing, price, product='MLB24531064', day=DAY):
    return ObservedOffer(
        source=ML, listing_id=listing, price=Decimal(price), catalog_product_id=product, observed_on=day
    )


def partition_of(listing):
    with connection.cursor() as cursor:
        cursor.execute('SELECT tableoid::regclass::text FROM dsc_price_observation WHERE listing_id = %s', [listing])
        return cursor.fetchone()[0]


def test_rows_land_in_the_month_partition_created_on_first_write():
    record_observations([offer('MLB1', '1095.79')], mechanism='server', search_item=company('A'))
    assert partition_of('MLB1') == partition_name(2026, 11)

    with connection.cursor() as cursor:
        cursor.execute('SELECT to_regclass(%s)', [partition_name(2026, 12)])
        assert cursor.fetchone()[0] is not None  # o mês seguinte já fica pronto


def test_partition_ddl_runs_once_per_month_per_process():
    ensure_partitions([DAY])
    with CaptureQueriesContext(connection) as queries:
        ensure_partitions([DAY, date(2026, 11, 30)])
    assert len(queries) == 0


def test_same_offer_same_day_is_stored_once_and_price_change_is_kept():
    item = company('A')
    record_observations([offer('MLB1', '1095.79'), offer('MLB1', '1095.79')], mechanism='server', search_item=item)
    record_observations([offer('MLB1', '1095.79'), offer('MLB1', '1049.00')], mechanism='server', search_item=item)
    prices = PriceObservation.objects.unscoped().filter(listing_id='MLB1').values_list('price', flat=True)
    assert sorted(prices) == [Decimal('1049.00'), Decimal('1095.79')]


def test_write_uses_a_constant_number_of_queries():
    item = company('A')
    ensure_partitions([DAY])

    def queries_for(total):
        offers = [offer(f'MLB{total}-{index}', '1000.00') for index in range(total)]
        with CaptureQueriesContext(connection) as captured:
            record_observations(offers, mechanism='server', search_item=item)
        return len(captured)

    assert queries_for(3) == queries_for(240)


def test_origin_is_kept_per_company_and_confirmations_count_distinct_companies():
    first, second = company('A'), company('B')
    record_observations([offer('MLB1', '1095.79')], mechanism='browser', search_item=first)
    record_observations([offer('MLB1', '1095.79')], mechanism='browser', search_item=first)
    record_observations([offer('MLB1', '1095.79')], mechanism='browser', search_item=second)

    observation = PriceObservation.objects.unscoped().get(listing_id='MLB1')
    assert observation.confirmed_contracts == 2 and not observation.server_confirmed
    assert ObservationOrigin.objects.unscoped().filter(listing_id='MLB1').count() == 2


def test_server_seeing_a_browser_offer_marks_it_confirmed():
    record_observations([offer('MLB1', '1095.79')], mechanism='browser', search_item=company('A'))
    record_observations([offer('MLB1', '1095.79')], mechanism='server', search_item=company('B'))
    observation = PriceObservation.objects.unscoped().get(listing_id='MLB1')
    assert observation.server_confirmed and observation.mechanism == 'browser'


def test_global_records_are_not_read_in_tenant_context():
    item = company('A')
    record_observations([offer('MLB1', '1095.79')], mechanism='server', search_item=item)
    for model in (PriceObservation, ObservationOrigin):
        with use_context(None), pytest.raises(TenantContextMissing):
            model.objects.exists()


def test_series_groups_by_day_with_median_and_leaves_gaps():
    item = company('A')
    record_observations(
        [offer('A1', '100'), offer('A2', '200'), offer('A3', '300'), offer('A4', '400')],
        mechanism='server',
        search_item=item,
    )
    record_observations([offer('B1', '150', day=date(2026, 11, 9))], mechanism='server', search_item=item)
    record_observations([offer('X1', '1', product='OUTRO')], mechanism='server', search_item=item)

    series = price_series(['MLB24531064'], date(2026, 11, 1), date(2026, 11, 30))
    assert [row['observed_on'] for row in series] == [DAY, date(2026, 11, 9)]  # dia 8 é lacuna
    first = series[0]
    assert (first['min_price'], first['max_price'], first['offer_count']) == (Decimal('100'), Decimal('400'), 4)
    assert first['median_price'] == Decimal('250') and first['avg_price'] == Decimal('250')


def test_series_skips_quarantined_and_unconfirmed_browser_offers(monkeypatch):
    item = company('A')
    record_observations([offer('S1', '100')], mechanism='server', search_item=item)
    record_observations([offer('B1', '1')], mechanism='browser', search_item=item)
    PriceObservation.objects.unscoped().filter(listing_id='S1').update(quarantined=True)
    assert price_series(['MLB24531064'], DAY, DAY)[0]['offer_count'] == 1  # B1 entra com o limite 1

    monkeypatch.setenv('SPECSHOP_BROWSER_CONFIRMATIONS', '2')
    assert price_series(['MLB24531064'], DAY, DAY) == []


def test_series_is_a_single_query():
    record_observations([offer('A1', '100')], mechanism='server', search_item=company('A'))
    with CaptureQueriesContext(connection) as queries:
        price_series(['MLB24531064', 'MLB47191870'], date(2026, 8, 9), date(2026, 11, 7))
    assert len(queries) == 1
