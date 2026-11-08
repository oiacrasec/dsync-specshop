from django.utils.translation import gettext_lazy as _
from django_filters import rest_framework as filters

from apps.core.filters import BaseFilterSet

from .models import TrackedProduct


class TrackedProductFilterSet(BaseFilterSet):
    general_search_fields = ('name', 'model', 'brand', 'ean')
    # Declarado à mão: filtro gerado pelo Meta consultaria o manager com escopo na importação.
    brand = filters.CharFilter(field_name='brand', lookup_expr='iexact')
    archived = filters.ChoiceFilter(
        label=_('Arquivado'),
        choices=(('false', _('Não')), ('true', _('Sim')), ('all', _('Todos'))),
        method='filter_archived',
    )
    ordering = filters.OrderingFilter(fields=('name', 'model', 'brand', 'created_at', 'updated_at'))

    def filter_queryset(self, queryset):
        if not self.form.cleaned_data.get('archived'):
            queryset = queryset.filter(deleted_at__isnull=True)
        return super().filter_queryset(queryset)

    def filter_archived(self, queryset, name, value):
        return queryset if value == 'all' else queryset.filter(deleted_at__isnull=value == 'false')

    class Meta:
        model = TrackedProduct
        fields = ()
