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


class BaseAdminModelViewSet(LookupOptionsMixin, viewsets.ModelViewSet):
    """CRUD administrativo ligado explicitamente aos selectors e services do recurso.

    Declare queryset_selector, save_service e delete_service como staticmethod;
    a base encaminha os dados validados e o ator, sem substituir regras do domínio.
    """

    permission_classes = [SuperadminPermission]
    options_permission_class = SuperadminPermission
    lookup_field = 'public_id'
    lookup_value_converter = 'uuid'
    options_label_field = 'name'
    options_search_fields = ('name',)
    ordering_fields = ('name', 'created_at', 'updated_at')
    schema_columns = ()
    schema_filters = ()

    def get_queryset(self):
        return self.queryset_selector()

    def perform_create(self, serializer):
        serializer.instance = self.save_service(values=serializer.validated_data, actor=self.request.user)

    def perform_update(self, serializer):
        serializer.instance = self.save_service(
            instance=serializer.instance, values=serializer.validated_data, actor=self.request.user
        )

    def perform_destroy(self, instance):
        self.delete_service(instance=instance, actor=self.request.user)

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
        filters.extend(self.schema_filters)
        return Response(
            {
                'columns': [{'field': field, 'label': label} for field, label in self.schema_columns],
                'filters': filters,
                'ordering_fields': self.ordering_fields,
            }
        )


class PlanViewSet(BaseAdminModelViewSet):
    serializer_class = PlanSerializer
    queryset_selector = staticmethod(selectors.admin_plans)
    save_service = staticmethod(services.save_plan)
    delete_service = staticmethod(services.delete_plan)
    schema_columns = (('name', _('Nome')), ('is_active', _('Ativo')))


class ContractViewSet(BaseAdminModelViewSet):
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
        records, total = selectors.admin_listing(
            selectors.superadmin_contract_organizations(contract),
            ordering_fields=('name',),
            **query.validated_data,
        )
        return Response({'data': OrganizationSummarySerializer(records, many=True).data, 'total_records': total})
