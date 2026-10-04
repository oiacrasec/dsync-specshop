"""Recursos administrativos: configuração explícita e ações do domínio."""

from django.utils.decorators import method_decorator
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import never_cache

from apps.core.views import BaseAdminModelViewSet, BaseReadOnlyModelViewSet
from apps.rbac.permissions import AllowAuthenticated
from apps.rbac.selectors import accessible_organizations

from .filters import ContractFilterSet, OrganizationFilterSet, PlanFilterSet
from .models import Contract, Organization, Plan
from .serializers import ContractSerializer, OrganizationSerializer, PlanSerializer


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


@method_decorator(never_cache, name='dispatch')
class OrganizationViewSet(BaseReadOnlyModelViewSet):
    queryset = Organization.objects.unscoped().filter(is_active=True, contract__deleted_at__isnull=True)
    serializer_class = OrganizationSerializer
    filterset_class = OrganizationFilterSet
    permission_classes = [AllowAuthenticated]
    options_permission_class = AllowAuthenticated
    options_label_field = 'name'
    options_search_fields = ('name',)
    schema_columns = ('name',)

    def get_queryset(self):
        if self.request.user.is_superuser:
            return super().get_queryset().only('public_id', 'name')
        return accessible_organizations(self.request.user).only('public_id', 'name')
