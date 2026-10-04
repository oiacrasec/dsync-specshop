"""Filtros compartilhados, por lista declarada, usando integração DRF do django-filter."""

from django.db.models import Q
from django_filters import rest_framework as filters

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
    search = filters.CharFilter(method='filter_search')
    ordering = filters.OrderingFilter(fields=('name', 'created_at', 'updated_at'))
    search_fields = ('name',)

    def filter_search(self, queryset, name, value):
        conditions = Q()
        for field in self.search_fields:
            conditions |= Q(**{f'{field}__icontains': value})
        return queryset.filter(conditions)

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return queryset.order_by(*(queryset.query.order_by or ('name',)), 'public_id')
