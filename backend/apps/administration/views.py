from django.utils.cache import add_never_cache_headers
from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.decorators import action

from apps.contracts.models import Contract, Plan
from apps.contracts.serializers import OrganizationSerializer
from apps.core.responses import build_exception_response, build_result_response
from apps.core.views import BaseAdminModelViewSet
from apps.users.serializers import UserSummarySerializer

from .filters import ContractFilterSet, PlanFilterSet
from .serializers import ContractProvisionSerializer, ContractSerializer, PlanSerializer
from .services import provision_contract


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

    @action(detail=True, methods=['post'])
    def provision(self, request, *args, **kwargs):
        """Cria a 1ª organização e o admin do contrato; senha temporária só nesta resposta."""
        try:
            contract = self.get_object()
            serializer = ContractProvisionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            organization, user, temporary_password = provision_contract(
                contract=contract, actor=request.user, **serializer.validated_data
            )
            result = {
                'organization': OrganizationSerializer(organization).data,
                'user': UserSummarySerializer(user).data,
                'temporary_password': temporary_password,
            }
            response = build_result_response(result, status_code=status.HTTP_201_CREATED)
        except Exception as exc:
            response = build_exception_response(exception=exc, request=request)
        add_never_cache_headers(response)
        return response
