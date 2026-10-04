"""Recursos administrativos: configuração explícita e ações do domínio."""

from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import action

from apps.core.selectors import filter_listing
from apps.core.views import BaseAdminModelViewSet

from . import selectors, services
from .serializers import AdminListQuerySerializer, ContractSerializer, OrganizationSummarySerializer, PlanSerializer


class PlanViewSet(BaseAdminModelViewSet):
    serializer_class = PlanSerializer
    queryset_selector = staticmethod(selectors.admin_plans)
    save_service = staticmethod(services.save_plan)
    delete_service = staticmethod(services.delete_plan)
    schema_columns = (('name', _('Nome')), ('is_active', _('Ativo')))
    list_query_serializer_class = AdminListQuerySerializer


class ContractViewSet(BaseAdminModelViewSet):
    list_query_serializer_class = AdminListQuerySerializer
    filter_fields = {'is_active': 'is_active', 'plan': 'plan__public_id'}
    serializer_class = ContractSerializer
    queryset_selector = staticmethod(selectors.admin_contracts)
    save_service = staticmethod(services.save_contract)
    delete_service = staticmethod(services.delete_contract)
    ordering_fields = (*BaseAdminModelViewSet.ordering_fields, 'start_date', 'end_date', 'licenses')
    schema_columns = (('name', _('Nome')), ('start_date', _('Início')), ('licenses', _('Licenças')))
    schema_filters = (
        {
            'field': 'plan',
            'label': _('Plano'),
            'type': 'relation',
            'options_url': '/api/v1/admin/plans/options/',
        },
    )

    @action(detail=True, methods=['get'])
    def organizations(self, request, **kwargs):
        contract = self.get_object()
        query = AdminListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        records = filter_listing(
            selectors.superadmin_contract_organizations(contract),
            ordering_fields=('name',),
            search_fields=('name',),
            filter_fields={'is_active': 'is_active'},
            **query.validated_data,
        )
        page = self.paginate_queryset(records)
        return self.get_paginated_response(OrganizationSummarySerializer(page, many=True).data)
