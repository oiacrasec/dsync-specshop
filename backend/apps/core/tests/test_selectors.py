from datetime import date

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.contracts.models import Contract, Organization, Plan
from apps.contracts.selectors import ContractSelector
from apps.core.selectors import BaseModelSelector
from apps.core.tenancy import TenantContext, TenantContextMissing, use_context


class OrganizationSelector(BaseModelSelector):
    model = Organization


def test_selector_requires_model():
    with pytest.raises(ImproperlyConfigured, match='Declare the selector model'):
        BaseModelSelector.get_queryset()


def test_default_selector_fails_without_tenant():
    with use_context(None), pytest.raises(TenantContextMissing):
        OrganizationSelector.get_queryset()


@pytest.mark.django_db
def test_default_selector_preserves_tenant_and_inactive_records():
    plan = Plan.objects.create(name='Plano')
    first = Contract.objects.create(name='Primeiro', plan=plan, start_date=date(2020, 1, 1), licenses=5)
    second = Contract.objects.create(name='Segundo', plan=plan, start_date=date(2020, 1, 1), licenses=5)
    visible = Organization.objects.create(name='Inativa', contract=first, is_active=False)
    excluded = Organization.objects.create(name='Excluída', contract=first)
    excluded.delete()
    Organization.objects.create(name='Outro tenant', contract=second)
    with use_context(TenantContext(contract_id=first.pk)):
        assert list(OrganizationSelector.get_queryset()) == [visible]


@pytest.mark.django_db
def test_admin_selector_is_lazy_and_fetches_plan_without_extra_queries():
    plan = Plan.objects.create(name='Plano')
    Contract.objects.create(name='Cliente', plan=plan, start_date=date(2020, 1, 1), licenses=5, is_active=False)
    with use_context(None), CaptureQueriesContext(connection) as construction:
        queryset = ContractSelector.get_queryset()
    assert len(construction) == 0
    with CaptureQueriesContext(connection) as evaluation:
        contracts = list(queryset)
        assert contracts[0].plan == plan and contracts[0].is_active is False
    assert len(evaluation) == 1
