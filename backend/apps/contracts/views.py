"""API administrativa de planos/contratos, exclusiva do superadmin."""

from django.utils.translation import gettext_lazy as _
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.views import LookupOptionsMixin

from . import selectors, services
from .permissions import SuperadminPermission
from .serializers import (
    AdminListQuerySerializer,
    ContractSerializer,
    OrganizationSummarySerializer,
    PlanSerializer,
)


class AdminCatalogViewSet(LookupOptionsMixin, viewsets.ModelViewSet):
    permission_classes = [SuperadminPermission]
    options_permission_class = SuperadminPermission
    lookup_field = 'public_id'
    lookup_value_converter = 'uuid'
    options_label_field = 'name'
    options_search_fields = ('name',)
    ordering_fields = ('name', 'created_at', 'updated_at')
    schema_columns = ()

    def list(self, request):
        query = AdminListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        records, total = selectors.admin_listing(
            self.get_queryset(), ordering_fields=self.ordering_fields, **query.validated_data
        )
        return Response({'data': self.get_serializer(records, many=True).data, 'total_records': total})

    @action(detail=False, methods=['get'])
    def schema(self, request):
        filters = [{'field': 'is_active', 'label': _('Ativo'), 'type': 'boolean'}]
        if isinstance(self, ContractViewSet):
            filters.append(
                {
                    'field': 'plan',
                    'label': _('Plano'),
                    'type': 'relation',
                    'options_url': '/api/v1/admin/plans/options/',
                }
            )
        return Response(
            {
                'columns': [{'field': field, 'label': label} for field, label in self.schema_columns],
                'filters': filters,
                'ordering_fields': self.ordering_fields,
            }
        )


class PlanViewSet(AdminCatalogViewSet):
    serializer_class = PlanSerializer
    schema_columns = (('name', _('Nome')), ('is_active', _('Ativo')))

    def get_queryset(self):
        return selectors.admin_plans()

    def perform_create(self, serializer):
        serializer.instance = services.save_plan(values=serializer.validated_data, actor=self.request.user)

    def perform_update(self, serializer):
        serializer.instance = services.save_plan(
            instance=serializer.instance, values=serializer.validated_data, actor=self.request.user
        )

    def perform_destroy(self, instance):
        services.delete_plan(instance=instance, actor=self.request.user)


class ContractViewSet(AdminCatalogViewSet):
    serializer_class = ContractSerializer
    ordering_fields = (*AdminCatalogViewSet.ordering_fields, 'start_date', 'end_date', 'licenses')
    schema_columns = (('name', _('Nome')), ('start_date', _('Início')), ('licenses', _('Licenças')))

    def get_queryset(self):
        return selectors.admin_contracts()

    def perform_create(self, serializer):
        serializer.instance = services.save_contract(values=serializer.validated_data, actor=self.request.user)

    def perform_update(self, serializer):
        serializer.instance = services.save_contract(
            instance=serializer.instance, values=serializer.validated_data, actor=self.request.user
        )

    def perform_destroy(self, instance):
        services.delete_contract(instance=instance, actor=self.request.user)

    @action(detail=True, methods=['get'])
    def organizations(self, request, **kwargs):
        contract = self.get_object()
        query = AdminListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        records, total = selectors.admin_listing(
            selectors.superadmin_contract_organizations(contract),
            ordering_fields=('name',),
            **query.validated_data,
        )
        return Response({'data': OrganizationSummarySerializer(records, many=True).data, 'total_records': total})
