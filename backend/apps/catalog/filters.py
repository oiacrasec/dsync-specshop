from django_filters import rest_framework as filters

from apps.core.filters import BaseFilterSet

from .models import TrackedProduct


class TrackedProductFilterSet(BaseFilterSet):
    general_search_fields = ('name', 'model', 'brand', 'ean')
    # Declarado à mão: filtro gerado pelo Meta consultaria o manager com escopo na importação.
    brand = filters.CharFilter(field_name='brand', lookup_expr='iexact')
    ordering = filters.OrderingFilter(fields=('name', 'model', 'brand', 'created_at', 'updated_at'))

    class Meta:
        model = TrackedProduct
        fields = ()
