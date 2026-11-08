from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django_filters import rest_framework as filters
from rest_framework.exceptions import ValidationError

from apps.core.filters import BaseFilterSet

from .models import PriceSearch
from .selectors import searches_on_dates, searches_using_product


class PriceSearchFilterSet(BaseFilterSet):
    date_from = filters.DateFilter(label=_('De'), method='filter_date')
    date_to = filters.DateFilter(label=_('Até'), method='filter_date')
    ordering = filters.OrderingFilter(fields=('created_at',))
    default_ordering = ('-created_at',)

    @classmethod
    def get_general_search_schema(cls):
        # Busca nos itens é própria do domínio: a base só descreve relações singulares.
        return {
            'parameter': 'search',
            'label': _('Busca geral'),
            'fields': [{'field': 'product', 'label': _('Produto'), 'lookup': 'icontains'}],
        }

    def filter_general_search(self, queryset, name, value):
        term = (value or '').strip()
        return searches_using_product(queryset, term) if term else queryset

    def filter_queryset(self, queryset):
        date_from = self.form.cleaned_data.get('date_from')
        date_to = self.form.cleaned_data.get('date_to')
        if date_from and date_to and date_from > date_to:
            raise ValidationError({'date_to': [_('A data final deve ser igual ou posterior à data inicial.')]})
        return super().filter_queryset(queryset)

    def filter_date(self, queryset, name, value):
        time_zone = ZoneInfo(getattr(self.request.user, 'time_zone', '') or settings.TIME_ZONE)
        return searches_on_dates(queryset, **{name: value}, time_zone=time_zone)

    class Meta:
        model = PriceSearch
        fields = ()
