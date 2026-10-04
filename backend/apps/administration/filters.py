from django.utils.translation import gettext_lazy as _
from django_filters import rest_framework as filters
from rest_framework.exceptions import ValidationError

from apps.contracts.models import Contract, Plan
from apps.core.filters import BaseFilterSet


class PlanFilterSet(BaseFilterSet):
    general_search_fields = ('name',)
    plan = filters.UUIDFilter(method='reject_plan')

    def reject_plan(self, queryset, name, value):
        raise ValidationError({'plan': _('Este filtro só está disponível para contratos.')})

    class Meta:
        model = Plan
        fields = ('is_active',)


class ContractFilterSet(BaseFilterSet):
    general_search_fields = ('name',)
    plan = filters.UUIDFilter(field_name='plan__public_id')
    ordering = filters.OrderingFilter(fields=('name', 'created_at', 'updated_at', 'start_date', 'end_date', 'licenses'))

    class Meta:
        model = Contract
        fields = ('is_active', 'plan')
