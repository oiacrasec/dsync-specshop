from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.audit.models import AuditEventType as Event
from apps.core.exceptions import LastActiveOrganization, OrganizationInUse
from apps.core.serializers import BaseModelSerializer
from apps.core.utils import context_values

from .models import Contract, Organization


class OrganizationSerializer(BaseModelSerializer):
    """CRUD da área do cliente (ADR 0037); contrato vem do contexto, nunca do payload.

    Escritas bloqueiam a linha do contrato: nome único e "pelo menos uma ativa" ficam
    serializados entre requisições concorrentes (decisões 52 e 53).
    """

    audit_fields = ('is_active',)  # Sem nome do cliente no JSON de auditoria (ADR 0020).
    audit_events = {
        'create': Event.ORGANIZATION_CREATED,
        'update': Event.ORGANIZATION_UPDATED,
        'delete': Event.ORGANIZATION_DELETED,
    }

    class Meta:
        model = Organization
        fields = ('public_id', 'name', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('public_id', 'created_at', 'updated_at')

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError(_('Informe o nome da organização.'))
        return name

    def validate(self, attrs):
        attrs = super().validate(attrs)
        contract_id = self._lock_contract()
        errors = {}
        name = attrs.get('name')
        if name is not None:
            duplicates = Organization.objects.filter(contract_id=contract_id, name__iexact=name)
            if self.instance is not None:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                errors['name'] = [_('Já existe uma organização com este nome no contrato.')]
        if errors:
            raise serializers.ValidationError(errors)
        if self.instance is not None and self.instance.is_active and attrs.get('is_active') is False:
            self._ensure_other_active(self.instance)
        return attrs

    def create_extra(self, validated_data):
        validated_data.update(context_values(Organization))

    def delete(self):
        with transaction.atomic():
            self._lock_contract()
            instance = self.lock_instance(self.instance)
            from apps.rbac.models import Assignment, AssignmentExclusion

            in_use = (
                Assignment.objects.filter(scope_organization=instance).exists()
                or AssignmentExclusion.objects.filter(excluded_organization=instance).exists()
            )
            if in_use:
                raise OrganizationInUse()
            if instance.is_active:
                self._ensure_other_active(instance)
            super().delete()

    def _lock_contract(self):
        contract_id = context_values(Organization)['contract_id']
        Contract.objects.select_for_update().filter(pk=contract_id).first()
        return contract_id

    def _ensure_other_active(self, instance):
        others = Organization.objects.filter(contract_id=instance.contract_id, is_active=True).exclude(pk=instance.pk)
        if not others.exists():
            raise LastActiveOrganization()
