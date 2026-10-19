from django_filters import rest_framework as filters

from apps.core.filters import BaseFilterSet

from .models import User


class UserFilterSet(BaseFilterSet):
    general_search_fields = ('username', 'first_name')
    default_ordering = ('username',)
    ordering = filters.OrderingFilter(fields=('username', 'first_name', 'created_at', 'updated_at'))

    class Meta:
        model = User
        fields = ('is_active',)
