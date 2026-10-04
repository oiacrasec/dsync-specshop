"""Padrão de SQL escrito à mão: `@tenant_params` + `fetch_all` (guia de estilo, "Queries SQL")."""

from datetime import date

import pytest
from django.db import connection

from apps.contracts.models import Contract, Organization, Plan
from apps.core.tenancy import TenantContext, TenantContextMissing, tenant_params, use_context
from apps.core.tests.scoping.models import ScopingMovement, ScopingProduct
from apps.core.utils import fetch_all

pytestmark = pytest.mark.django_db

MOVEMENTS_REPORT = """-- MOVEMENTS REPORT
WITH parametros AS (
    SELECT
        %(contract)s::bigint AS contract,
        %(organization)s::bigint AS organization
)
SELECT m.quantity, p.name AS product
FROM dsc_scoping_movement m
JOIN parametros par ON par.contract = m.contract_id AND par.organization = m.organization_id
JOIN dsc_scoping_product p ON p.id = m.product_id
WHERE m.deleted_at IS NULL AND m.quantity >= %(min_quantity)s
ORDER BY m.quantity
"""

MOVEMENTS_TEMP_REPORT = """-- MOVEMENTS TEMP REPORT
CREATE TEMPORARY TABLE parametros ON COMMIT DROP AS
SELECT
    %(contract)s::bigint AS contract,
    %(organization)s::bigint AS organization;
CREATE INDEX ON parametros (contract, organization);
ANALYZE parametros;
SELECT m.quantity
FROM dsc_scoping_movement m
JOIN parametros par ON par.contract = m.contract_id AND par.organization = m.organization_id
ORDER BY m.quantity;
"""


@tenant_params(organization=True)
def movements_report(min_quantity=0, *, tenant):
    with connection.cursor() as cursor:
        cursor.execute(MOVEMENTS_REPORT, {**tenant, 'min_quantity': min_quantity})
        return fetch_all(cursor)


@tenant_params(organization=True)
def movements_temp_report(*, tenant):
    with connection.cursor() as cursor:
        cursor.execute(MOVEMENTS_TEMP_REPORT, tenant)
        return fetch_all(cursor)


@tenant_params()
def contract_only(*, tenant):
    return tenant


@pytest.fixture
def world():
    plan = Plan.objects.create(name='P')
    data = {}
    for key, quantity in (('a', 10), ('b', 99)):
        contract = Contract.objects.create(name=key, plan=plan, start_date=date(2020, 1, 1), licenses=5)
        main = Organization.objects.create(name=f'{key}-1', contract=contract)
        sibling = Organization.objects.create(name=f'{key}-2', contract=contract)
        product = ScopingProduct.objects.create(name=f'prod-{key}', contract=contract)
        for organization, value in ((main, quantity), (sibling, quantity + 1)):
            ScopingMovement.objects.create(
                contract=contract, organization=organization, product=product, quantity=value
            )
        data[key] = TenantContext(contract_id=contract.pk, organization_id=main.pk)
    return data


def test_cte_query_returns_only_the_context_organization_as_dicts(world):
    with use_context(world['a']):
        assert movements_report() == [{'quantity': 10, 'product': 'prod-a'}]
        assert movements_report(min_quantity=11) == []  # Parâmetro de negócio.
    with use_context(world['b']):
        assert movements_report() == [{'quantity': 99, 'product': 'prod-b'}]


def test_temporary_table_query_runs_in_a_single_execute(world):
    with use_context(world['a']):
        assert movements_temp_report() == [{'quantity': 10}]


@pytest.mark.parametrize(
    'missing',
    [None, TenantContext(superuser=True), TenantContext(contract_id=1)],
    ids=['sem-contexto', 'superadmin-sem-organizacao', 'sem-organizacao'],
)
def test_decorator_fails_closed_without_the_required_context(missing):
    with use_context(missing), pytest.raises(TenantContextMissing, match='movements_report'):
        movements_report()


def test_decorator_injects_tenant_and_keeps_function_metadata():
    with use_context(TenantContext(contract_id=7)):
        assert contract_only() == {'contract': 7, 'organization': None}
    assert contract_only.__name__ == 'contract_only'


def test_fetch_all_without_rows_or_result_set():
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1 AS one WHERE false')
        assert fetch_all(cursor) == []
        cursor.execute('CREATE TEMPORARY TABLE empty_check (id int) ON COMMIT DROP')
        assert fetch_all(cursor) == []
