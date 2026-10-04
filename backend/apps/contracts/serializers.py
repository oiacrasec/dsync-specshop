from rest_framework import serializers

from apps.core.constants import OPTIONS_DEFAULT_ROWS, OPTIONS_MAX_ROWS
from apps.core.serializers import ScopedModelSerializer

from .models import Contract, Organization, Plan


class AdminListQuerySerializer(serializers.Serializer):
    first = serializers.IntegerField(default=0, min_value=0)
    rows = serializers.IntegerField(default=OPTIONS_DEFAULT_ROWS, min_value=1, max_value=OPTIONS_MAX_ROWS)
    search = serializers.CharField(default='', allow_blank=True, max_length=255)
    ordering = serializers.CharField(default='name', max_length=100)
    is_active = serializers.BooleanField(required=False, default=None, allow_null=True)
    plan = serializers.UUIDField(required=False)


class PlanSerializer(ScopedModelSerializer):
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


class ContractSerializer(ScopedModelSerializer):
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
