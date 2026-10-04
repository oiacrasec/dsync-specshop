from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django_filters import rest_framework as filters

from apps.contracts.models import Contract, Plan
from apps.core.filters import BaseFilterSet
from apps.core.tenancy import TenantContext, use_context


class SearchFilterSet(BaseFilterSet):
    name = filters.CharFilter(lookup_expr='exact')
    general_search_fields = ('name', 'plan__name')

    class Meta:
        model = Contract
        fields = ('name', 'is_active')


@pytest.mark.django_db
def test_general_search_combines_or_fields_with_and_individual_filters_and_scope():
    plan = Plan.objects.create(name='Premium')
    other = Plan.objects.create(name='Básico')
    contract = Contract.objects.create(name='Cliente', plan=plan, start_date=date(2020, 1, 1), licenses=5)
    foreign = Contract.objects.create(name='Premium', plan=other, start_date=date(2020, 1, 1), licenses=5)
    queryset = Contract.objects.unscoped()
    search = SearchFilterSet(data={'search': 'Premium'}, queryset=queryset)
    assert search.is_valid()
    assert set(search.qs.values_list('pk', flat=True)) == {contract.pk, foreign.pk}
    combined = SearchFilterSet(data={'search': 'Premium', 'name': 'Cliente'}, queryset=queryset)
    assert combined.is_valid() and list(combined.qs.values_list('pk', flat=True)) == [contract.pk]
    with use_context(TenantContext(contract_id=contract.pk)):
        scoped = SearchFilterSet(data={'search': 'Premium'}, queryset=Contract.objects.all())
        with CaptureQueriesContext(connection) as queries:
            assert list(scoped.qs.values_list('pk', flat=True)) == [contract.pk]
    assert len(queries) == 1
    assert all(not query['sql'].lstrip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')) for query in queries)


@pytest.mark.django_db
def test_general_search_does_not_inherit_exact_lookup_of_individual_filter():
    plan = Plan.objects.create(name='Plano')
    contract = Contract.objects.create(name='Prefeitura', plan=plan, start_date=date(2020, 1, 1), licenses=5)
    partial = SearchFilterSet(data={'search': 'feitu'}, queryset=Contract.objects.unscoped())
    assert list(partial.qs.values_list('pk', flat=True)) == [contract.pk]
    exact = SearchFilterSet(data={'name': 'feitu'}, queryset=Contract.objects.unscoped())
    assert not exact.qs.exists()


@pytest.mark.django_db
def test_general_search_can_use_explicit_text_lookup():
    class PrefixFilterSet(SearchFilterSet):
        general_search_fields = ('name',)
        general_search_lookups = {'name': 'istartswith'}

    plan = Plan.objects.create(name='Plano')
    contract = Contract.objects.create(name='Prefeitura', plan=plan, start_date=date(2020, 1, 1), licenses=5)
    query = Contract.objects.unscoped()
    assert list(PrefixFilterSet(data={'search': 'pre'}, queryset=query).qs.values_list('pk', flat=True)) == [
        contract.pk
    ]
    assert not PrefixFilterSet(data={'search': 'feitu'}, queryset=query).qs.exists()


@pytest.mark.parametrize('field', ['licenses', 'start_date', 'public_id', 'plan', 'plan__public_id', 'missing'])
def test_general_search_rejects_non_text_or_unknown_fields(field):
    class InvalidFilterSet(SearchFilterSet):
        general_search_fields = (field,)

    with pytest.raises(ImproperlyConfigured):
        InvalidFilterSet.get_general_search_schema()


def test_general_search_rejects_unbounded_regex_lookup():
    class InvalidFilterSet(SearchFilterSet):
        general_search_lookups = {'name': 'regex'}

    with pytest.raises(ImproperlyConfigured, match='supported textual'):
        InvalidFilterSet.get_general_search_schema()


def test_general_search_rejects_overrides_for_undeclared_fields():
    class InvalidFilterSet(SearchFilterSet):
        general_search_lookups = {'missing': 'exact'}

    with pytest.raises(ImproperlyConfigured, match='declared search field'):
        InvalidFilterSet.get_general_search_schema()


def test_general_search_rejects_multivalued_relations():
    class InvalidFilterSet(BaseFilterSet):
        general_search_fields = ('groups__name',)

        class Meta:
            model = get_user_model()
            fields = ('is_active',)

    with pytest.raises(ImproperlyConfigured, match='single-valued forward relations'):
        InvalidFilterSet.get_general_search_schema()


@pytest.mark.django_db
def test_general_search_schema_is_separate_and_generated_without_database_access():
    with CaptureQueriesContext(connection) as queries:
        schema = SearchFilterSet.get_general_search_schema()
    assert len(queries) == 0
    assert schema == {
        'parameter': 'search',
        'label': 'Busca geral',
        'fields': [
            {'field': 'name', 'label': 'Nome', 'lookup': 'icontains'},
            {'field': 'plan__name', 'label': 'Nome', 'lookup': 'icontains'},
        ],
    }


def test_general_search_can_be_disabled():
    class NoSearchFilterSet(SearchFilterSet):
        general_search_fields = ()

    assert NoSearchFilterSet.get_general_search_schema() is None
