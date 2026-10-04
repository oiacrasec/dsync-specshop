"""Filtros compartilhados, por lista declarada, usando integração DRF do django-filter."""

from django.core.exceptions import FieldDoesNotExist, ImproperlyConfigured
from django.db import models
from django.db.models import Q
from django.utils.text import capfirst
from django.utils.translation import gettext_lazy as _
from django_filters import rest_framework as filters

from .constants import GENERAL_SEARCH_LOOKUPS
from .serializers import ListQuerySerializer


class ValidatedDjangoFilterBackend(filters.DjangoFilterBackend):
    """Preserva limites/normalização da entrada antes dos FilterSets."""

    def get_filterset_kwargs(self, request, queryset, view):
        kwargs = super().get_filterset_kwargs(request, queryset, view)
        query = ListQuerySerializer(data=kwargs['data'])
        query.is_valid(raise_exception=True)
        data = kwargs['data'].copy()
        for field, value in query.validated_data.items():
            if value is not None:
                data[field] = value
        kwargs['data'] = data
        return kwargs


class BaseFilterSet(filters.FilterSet):
    is_active = filters.BooleanFilter()
    search = filters.CharFilter(method='filter_general_search')
    ordering = filters.OrderingFilter(fields=('name', 'created_at', 'updated_at'))
    general_search_fields = ()
    general_search_lookups = {}

    @classmethod
    def get_general_search_fields(cls):
        if cls.general_search_lookups.keys() - set(cls.general_search_fields):
            raise ImproperlyConfigured('General search lookup overrides require a declared search field.')
        result = []
        for name in cls.general_search_fields:
            model = cls._meta.model
            parts = name.split('__')
            for index, part in enumerate(parts):
                try:
                    field = model._meta.get_field(part)
                except FieldDoesNotExist:
                    raise ImproperlyConfigured(f'Unknown general search field: {name}.') from None
                if index < len(parts) - 1:
                    if not field.concrete or not (field.many_to_one or field.one_to_one):
                        raise ImproperlyConfigured('General search only supports single-valued forward relations.')
                    model = field.related_model
                elif not isinstance(field, (models.CharField, models.TextField)):
                    raise ImproperlyConfigured('General search requires text fields; use individual filters otherwise.')
            lookup = cls.general_search_lookups.get(name, 'icontains')
            if lookup not in GENERAL_SEARCH_LOOKUPS:
                raise ImproperlyConfigured('Declare a supported textual general search lookup.')
            result.append({'field': name, 'label': capfirst(field.verbose_name), 'lookup': lookup})
        return result

    @classmethod
    def get_general_search_schema(cls):
        fields = cls.get_general_search_fields()
        if not fields:
            return None
        return {'parameter': 'search', 'label': _('Busca geral'), 'fields': fields}

    def filter_general_search(self, queryset, name, value):
        search_value = (value or '').strip()
        fields = self.get_general_search_fields()
        if not search_value or not fields:
            return queryset
        conditions = Q()
        for field in fields:
            conditions |= Q(**{f'{field["field"]}__{field["lookup"]}': search_value})
        return queryset.filter(conditions)

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return queryset.order_by(*(queryset.query.order_by or ('name',)), 'public_id')
