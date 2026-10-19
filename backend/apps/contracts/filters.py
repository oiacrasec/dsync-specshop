from django_filters import rest_framework as filters

from apps.core.filters import BaseFilterSet

from .models import Organization


class OrganizationFilterSet(BaseFilterSet):
    general_search_fields = ('name',)
    ordering = filters.OrderingFilter(fields=('name', 'created_at', 'updated_at'))

    class Meta:
        model = Organization
        fields = ('is_active',)
