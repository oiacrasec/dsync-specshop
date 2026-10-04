from apps.core.serializers import ScopedModelSerializer, ServiceModelSerializer

from . import services
from .models import Contract, Organization, Plan


class PlanSerializer(ServiceModelSerializer):
    save_service = staticmethod(services.PlanService.save_instance)

    class Meta:
        model = Plan
        fields = (
            'public_id',
            'name',
            'max_organizations',
            'max_storage_bytes',
            'max_integrations',
            'max_operations_per_month',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('public_id', 'created_at', 'updated_at')


class ContractSerializer(ServiceModelSerializer):
    save_service = staticmethod(services.ContractService.save_instance)

    def get_fields(self):
        fields = super().get_fields()
        fields['plan'].queryset = Plan.objects.unscoped()
        return fields

    class Meta:
        model = Contract
        fields = (
            'public_id',
            'name',
            'plan',
            'start_date',
            'end_date',
            'licenses',
            'post_termination_retention_days',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('public_id', 'created_at', 'updated_at')


class OrganizationSummarySerializer(ScopedModelSerializer):
    class Meta:
        model = Organization
        fields = ('public_id', 'name')
