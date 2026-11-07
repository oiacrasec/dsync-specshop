from django_filters import rest_framework as filters

from apps.core.filters import BaseFilterSet

from .models import PriceSearch


class PriceSearchFilterSet(BaseFilterSet):
    ordering = filters.OrderingFilter(fields=('created_at',))

    class Meta:
        model = PriceSearch
        fields = ()
