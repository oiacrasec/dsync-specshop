from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.audit.models import AuditEventType as Event
from apps.contracts.models import Contract, Plan
from apps.core.serializers import BaseAdminModelSerializer

from .constants import CONTRACT_AUDIT_FIELDS, PLAN_AUDIT_FIELDS


class PlanSerializer(BaseAdminModelSerializer):
    audit_fields = PLAN_AUDIT_FIELDS
    # fmt: off
    audit_events = {
        'create': Event.PLAN_CREATED,
        'update': Event.PLAN_UPDATED,
        'delete': Event.PLAN_DELETED
    }
    # fmt: on

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


class ContractSerializer(BaseAdminModelSerializer):
    audit_fields = CONTRACT_AUDIT_FIELDS
    audit_events = {
        'create': Event.CONTRACT_CREATED,
        'update': Event.CONTRACT_UPDATED,
        'delete': Event.CONTRACT_DELETED,
    }

    def get_fields(self):
        fields = super().get_fields()
        fields['plan'].queryset = Plan.objects.unscoped()
        return fields

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start_date is not None and end_date is not None and end_date < start_date:
            errors['end_date'] = [_('O fim da vigência não pode ser anterior ao início.')]
        if attrs.get('plan') is not None:
            if not Plan.objects.unscoped().select_for_update().filter(pk=attrs['plan'].pk).exists():
                errors['plan'] = [_('Informe um plano disponível.')]
        if self.instance is not None:
            licenses = attrs.get('licenses', self.instance.licenses)
            if licenses < self.instance.licenses:
                occupied = get_user_model().objects.unscoped().filter(contract_id=self.instance.pk).count()
                if licenses < occupied:
                    errors['licenses'] = [_('O limite não pode ser menor que os usuários não excluídos.')]
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

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
