from django.utils.translation import gettext_lazy as _
from django_filters import rest_framework as filters
from rest_framework.exceptions import ValidationError

from apps.core.filters import BaseFilterSet

from .models import Organization


class OrganizationFilterSet(BaseFilterSet):
    general_search_fields = ('name',)
    plan = filters.UUIDFilter(method='reject_plan')
    contract = filters.UUIDFilter(field_name='contract__public_id')
    ordering = filters.OrderingFilter(fields=('name',))

    def reject_plan(self, queryset, name, value):
        raise ValidationError({'plan': _('Este filtro só está disponível para contratos.')})

    class Meta:
        model = Organization
        fields = ('is_active',)
