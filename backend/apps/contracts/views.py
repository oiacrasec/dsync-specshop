"""Organizações na área do cliente (ADR 0037): menu do admin do contrato e de quem tiver permissão."""

from apps.core.views import BaseModelViewSet
from apps.rbac.permissions import ContractWidePermission

from .filters import OrganizationFilterSet
from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationViewSet(BaseModelViewSet):
    model = Organization
    serializer_class = OrganizationSerializer
    filterset_class = OrganizationFilterSet
    permission_classes = [ContractWidePermission]
    permission_resource = 'organization'
    options_label_field = 'name'
    options_search_fields = ('name',)
    schema_columns = ('name', 'is_active')
    schema_filters = ('is_active',)
