from types import SimpleNamespace

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from apps.contracts.models import Contract, Plan
from apps.contracts.views import ContractViewSet
from apps.core.schema import filter_schema


@pytest.mark.django_db
def test_schema_metadata_and_route_resolution_do_not_query_database():
    view = ContractViewSet(schema_options_routes={Plan: 'admin-plan-options'})
    view.request = SimpleNamespace(resolver_match=SimpleNamespace(namespace=''), urlconf=None)
    with CaptureQueriesContext(connection) as queries:
        columns = view.get_schema_columns()
        filters = view.get_schema_filters()
    assert len(queries) == 0
    assert columns == [
        {'field': 'name', 'label': 'Nome'},
        {'field': 'start_date', 'label': 'Início'},
        {'field': 'licenses', 'label': 'Licenças'},
    ]
    assert filters == [
        {'field': 'is_active', 'label': 'Ativo', 'type': 'boolean'},
        {'field': 'plan', 'label': 'Plano', 'type': 'relation', 'options_url': reverse('admin-plan-options')},
    ]


def test_column_override_changes_only_selected_label():
    view = ContractViewSet(schema_column_overrides={'licenses': {'label': 'Vagas'}})
    assert view.get_schema_columns() == [
        {'field': 'name', 'label': 'Nome'},
        {'field': 'start_date', 'label': 'Início da vigência'},
        {'field': 'licenses', 'label': 'Vagas'},
    ]


def test_filter_override_supports_relation_outside_router():
    view = ContractViewSet(schema_filter_overrides={'plan': {'label': 'Oferta', 'options_url': '/other/options/'}})
    assert view.get_schema_filters()[1] == {
        'field': 'plan',
        'label': 'Oferta',
        'type': 'relation',
        'options_url': '/other/options/',
    }


def test_unregistered_relation_route_fails_instead_of_guessing_url():
    with pytest.raises(ImproperlyConfigured, match='related options route'):
        ContractViewSet().get_schema_filters()


def test_schema_cannot_advertise_filter_not_supported_by_filterset():
    with pytest.raises(ImproperlyConfigured, match='Declare a FilterSet filter'):
        ContractViewSet(schema_filters=('licenses',)).get_schema_filters()


def test_unknown_column_fails_instead_of_exposing_invalid_metadata():
    with pytest.raises(ImproperlyConfigured, match='Unknown schema field'):
        ContractViewSet(schema_columns=('missing',)).get_schema_columns()


@pytest.mark.parametrize('name,kind', [('is_active', 'boolean'), ('start_date', 'date'), ('licenses', 'number')])
def test_filter_type_comes_from_model(name, kind):
    assert filter_schema(Contract, name, {})['type'] == kind
