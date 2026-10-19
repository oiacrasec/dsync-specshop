from django.utils.cache import add_never_cache_headers
from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.decorators import action

from apps.contracts.models import Contract, Plan
from apps.core.responses import build_exception_response, build_result_response
from apps.core.views import BaseAdminModelViewSet
from apps.rbac.selectors import contract_admin_users
from apps.rbac.serializers import OrganizationSummarySerializer
from apps.users.serializers import UserSummarySerializer

from .filters import ContractFilterSet, PlanFilterSet
from .serializers import ContractAdminSerializer, ContractProvisionSerializer, ContractSerializer, PlanSerializer
from .services import provision_contract, reset_admin_password


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
                'organization': OrganizationSummarySerializer(organization).data,
                'user': UserSummarySerializer(user).data,
                'temporary_password': temporary_password,
            }
            response = build_result_response(result, status_code=status.HTTP_201_CREATED)
        except Exception as exc:
            response = build_exception_response(exception=exc, request=request)
        add_never_cache_headers(response)
        return response

    @action(detail=True, methods=['get'])
    def admins(self, request, *args, **kwargs):
        """Admins do contrato (atribuição essencial ativa), ativos ou não, paginados."""
        try:
            contract = self.get_object()
            queryset = contract_admin_users(contract.pk).order_by('username', 'public_id')
            page = self.paginate_queryset(queryset)
            response = self.get_paginated_response(ContractAdminSerializer(page, many=True).data)
        except Exception as exc:
            response = build_exception_response(exception=exc, request=request)
        add_never_cache_headers(response)
        return response

    @action(detail=True, methods=['post'], url_path='admins/<uuid:user_public_id>/reset-password')
    def admin_password_reset(self, request, user_public_id, *args, **kwargs):
        """Nova senha temporária do admin; devolvida só nesta resposta."""
        try:
            contract = self.get_object()
            user, temporary_password = reset_admin_password(
                contract=contract, user_public_id=user_public_id, actor=request.user
            )
            result = {'user': ContractAdminSerializer(user).data, 'temporary_password': temporary_password}
            response = build_result_response(result)
        except Exception as exc:
            response = build_exception_response(exception=exc, request=request)
        add_never_cache_headers(response)
        return response
