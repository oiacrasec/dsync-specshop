from django.utils.translation import gettext_lazy as _

from apps.contracts.models import Contract, Plan
from apps.core.views import BaseAdminModelViewSet

from .filters import ContractFilterSet, PlanFilterSet
from .serializers import ContractSerializer, PlanSerializer


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
