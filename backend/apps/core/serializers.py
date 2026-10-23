"""Camada E (ADR 0006 §1.3): FKs restritas ao contexto e identificadas pelo public_id."""

from contextlib import nullcontext
from datetime import date, datetime

from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.db import connection, models, transaction
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from apps.audit import services as audit_services

from .constants import OPTIONS_DEFAULT_ROWS, OPTIONS_MAX_ROWS, SERIALIZER_HIDDEN_FIELDS
from .tenancy import system_context


class PublicIdRelatedField(serializers.SlugRelatedField):
    """FK pelo public_id. O queryset padrão é o manager com escopo, avaliado a cada requisição:
    registro de outro contrato ou organização responde "não existe" (anti-IDOR)."""

    def __init__(self, **kwargs):
        kwargs.setdefault('slug_field', 'public_id')
        super().__init__(**kwargs)


class ScopedModelSerializer(serializers.ModelSerializer):
    serializer_related_field = PublicIdRelatedField

    def get_fields(self):
        fields = super().get_fields()
        for name in SERIALIZER_HIDDEN_FIELDS:
            fields.pop(name, None)
        return fields


class BaseModelSerializer(ScopedModelSerializer):
    """CRUD do DRF com autoria e auditoria; validar/salvar na mesma transação."""

    audit_fields = ()
    audit_events = {}
    write_scope = staticmethod(nullcontext)

    def check_write_permission(self):
        actor = self.context['request'].user
        if not actor.is_authenticated or not actor.is_active or actor.deleted_at is not None:
            raise PermissionDenied()

    def get_actor(self):
        self.check_write_permission()
        return self.context['request'].user

    def lock_instance(self, instance):
        if self.context.get('instance_locked'):
            return instance
        queryset = self.Meta.model.objects.select_for_update(of=('self',))
        return get_object_or_404(queryset, pk=instance.pk)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self.check_write_permission()
        if not connection.in_atomic_block:
            raise ImproperlyConfigured('Validate and save audited serializers inside the same transaction.')
        with self.write_scope():
            if self.instance is not None:
                self.instance = self.lock_instance(self.instance)
        return attrs

    def get_audit_state(self, instance):
        state = {}
        for name in self.audit_fields:
            value = getattr(instance, name)
            if isinstance(value, models.Model):
                value = str(value.public_id)
            elif isinstance(value, date | datetime):
                value = value.isoformat()
            state[name] = value
        state['deleted'] = instance.deleted_at is not None
        return state

    def get_audit_contract_id(self, instance):
        if instance._meta.concrete_model._meta.label == 'contracts.Contract':
            return instance.pk
        return getattr(instance, 'contract_id', None)

    def record_audit(self, action, instance, actor, before):
        event = self.audit_events.get(action)
        if event is None:
            raise ImproperlyConfigured('Declare the audit event before exposing serializer writes.')
        audit_services.record(
            event,
            actor=actor,
            target=instance,
            contract_id=self.get_audit_contract_id(instance),
            before=before,
            after=self.get_audit_state(instance),
        )

    def create_extra(self, validated_data):
        """Ajustes antes de super().create(); M2M padrão é persistido pelo DRF."""

    def update_extra(self, instance, validated_data):
        """Ajustes antes de super().update(); não persistir a instância aqui."""

    def create(self, validated_data):
        with self.write_scope(), transaction.atomic():
            actor = self.get_actor()
            self.create_extra(validated_data)
            validated_data.update(created_by=actor, updated_by=actor)
            created = super().create(validated_data)
            self.record_audit('create', created, actor, None)
            return created

    def update(self, instance, validated_data):
        with self.write_scope(), transaction.atomic():
            actor = self.get_actor()
            before = self.get_audit_state(instance)
            self.update_extra(instance, validated_data)
            validated_data['updated_by'] = actor
            updated = super().update(instance, validated_data)
            self.record_audit('update', updated, actor, before)
            return updated

    def delete(self):
        with self.write_scope(), transaction.atomic():
            actor = self.get_actor()
            instance = self.lock_instance(self.instance)
            before = self.get_audit_state(instance)
            instance.delete(actor=actor)
            self.record_audit('delete', instance, actor, before)


class BaseAdminModelSerializer(BaseModelSerializer):
    """Escrita administrativa global, autorizada explicitamente ao superadmin."""

    write_scope = staticmethod(system_context)

    def check_write_permission(self):
        super().check_write_permission()
        if not self.context['request'].user.is_superuser:
            raise PermissionDenied(_('A gestão administrativa exige superadmin.'))

    def get_actor(self):
        actor = super().get_actor()
        if not get_user_model().objects.unscoped().filter(pk=actor.pk, is_active=True, is_superuser=True).exists():
            raise PermissionDenied(_('A gestão administrativa exige superadmin.'))
        return actor


# Base de todo serializer sem model (nunca `serializers.Serializer` direto; um teste trava).
# Ponto único para regras comuns de entrada e saída. Comentário, não docstring: seria herdada
# no OpenAPI. O `ValidationError` do Django já vira erro de campo na validação (DRF) e 422 no
# `save()` (handler RFC 9457): não converter à mão.
class BaseSerializer(serializers.Serializer):
    pass


class PageQuerySerializer(BaseSerializer):
    first = serializers.IntegerField(default=0, min_value=0)
    rows = serializers.IntegerField(default=OPTIONS_DEFAULT_ROWS, min_value=1, max_value=OPTIONS_MAX_ROWS)


class ListQuerySerializer(PageQuerySerializer):
    search = serializers.CharField(default='', allow_blank=True, max_length=255)
    ordering = serializers.CharField(required=False, default=None, allow_null=True, max_length=100)
    is_active = serializers.BooleanField(required=False, default=None, allow_null=True)


class OptionsQuerySerializer(PageQuerySerializer):
    """Entrada do autocomplete; ListField lê public_id repetido no QueryDict."""

    q = serializers.CharField(required=False, allow_blank=True, default='', max_length=255)
    public_id = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=False, max_length=OPTIONS_MAX_ROWS
    )
