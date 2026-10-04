"""Recursos administrativos: configuração explícita e ações do domínio."""

from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from apps.core.serializers import ListQuerySerializer
from apps.core.views import BaseAdminModelViewSet

from . import selectors
from .filters import ContractFilterSet, OrganizationFilterSet, PlanFilterSet
from .models import Contract, Plan
from .serializers import ContractSerializer, OrganizationSummarySerializer, PlanSerializer


class PlanViewSet(BaseAdminModelViewSet):
    queryset = Plan.objects.unscoped()
    serializer_class = PlanSerializer
    filterset_class = PlanFilterSet
    schema_columns = ('name', 'is_active')


class ContractViewSet(BaseAdminModelViewSet):
    queryset = Contract.objects.unscoped().select_related('plan')
    serializer_class = ContractSerializer
    filterset_class = ContractFilterSet
    schema_columns = ('name', 'start_date', 'licenses')
    schema_column_overrides = {'start_date': {'label': _('Início')}}
    schema_filters = ('plan',)

    @action(detail=True, methods=['get'])
    def organizations(self, request, **kwargs):
        contract = self.get_object()
        query = ListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        filters = OrganizationFilterSet(
            data={**request.query_params.dict(), **query.validated_data},
            queryset=selectors.superadmin_contract_organizations(contract),
            request=request,
        )
        if not filters.is_valid():
            raise ValidationError(filters.errors)
        page = self.paginate_queryset(filters.qs)
        return self.get_paginated_response(OrganizationSummarySerializer(page, many=True).data)
