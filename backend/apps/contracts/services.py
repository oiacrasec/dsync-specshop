"""Escritas administrativas; locks locais, nunca globais."""

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404
from django.utils.translation import gettext_lazy as _

from apps.audit.models import AuditEventType as Event
from apps.audit.services import record
from apps.core.tenancy import system_scope

from .constants import CONTRACT_AUDIT_FIELDS, PLAN_AUDIT_FIELDS
from .models import Contract, Plan


def _authorize(actor):
    if actor is None or not get_user_model().objects.filter(pk=actor.pk, is_active=True, is_superuser=True).exists():
        raise PermissionDenied(_('A gestão de planos e contratos exige superadmin.'))


def _current(model, instance):
    if instance is None:
        return model()
    try:
        return model.objects.select_for_update().get(pk=instance.pk)
    except model.DoesNotExist:
        raise Http404 from None


def _state(instance):
    fields = PLAN_AUDIT_FIELDS if isinstance(instance, Plan) else CONTRACT_AUDIT_FIELDS
    result = {field: getattr(instance, field) for field in fields}
    if isinstance(instance, Contract):
        result['plan'] = str(instance.plan.public_id)
        result['start_date'] = instance.start_date.isoformat()
        result['end_date'] = instance.end_date.isoformat() if instance.end_date else None
    result['deleted'] = instance.deleted_at is not None
    return result


def _audit(event, instance, actor, before):
    record(
        event,
        actor=actor,
        target=instance,
        contract_id=instance.pk if isinstance(instance, Contract) else None,
        before=before,
        after=_state(instance),
    )


@system_scope
@transaction.atomic
def save_plan(*, values, actor, instance=None):
    _authorize(actor)
    plan = _current(Plan, instance)
    before = _state(plan) if instance is not None else None
    for field, value in values.items():
        setattr(plan, field, value)
    plan.full_clean(exclude={'created_by', 'updated_by', 'deleted_by'})
    plan.save(actor=actor)
    _audit(Event.PLAN_CREATED if instance is None else Event.PLAN_UPDATED, plan, actor, before)
    return plan


@system_scope
@transaction.atomic
def save_contract(*, values, actor, instance=None):
    _authorize(actor)
    contract = _current(Contract, instance)
    before = _state(contract) if instance is not None else None
    previous_licenses = None if instance is None else contract.licenses
    for field, value in values.items():
        setattr(contract, field, value)
    if 'plan' in values:
        # Serializa com a exclusão do plano, sem bloquear todos os contratos.
        if not Plan.objects.select_for_update().filter(pk=contract.plan_id).exists():
            raise ValidationError({'plan': _('Informe um plano disponível.')})
    if previous_licenses is not None and contract.licenses < previous_licenses:
        occupied = get_user_model().objects.filter(contract_id=contract.pk).count()
        if contract.licenses < occupied:
            raise ValidationError({'licenses': _('O limite não pode ser menor que os usuários não excluídos.')})
    # A FK foi validada acima quando recebida; permite editar contratos com plano histórico excluído.
    contract.full_clean(exclude={'plan', 'created_by', 'updated_by', 'deleted_by'})
    contract.save(actor=actor)
    _audit(Event.CONTRACT_CREATED if instance is None else Event.CONTRACT_UPDATED, contract, actor, before)
    return contract


@system_scope
@transaction.atomic
def delete_plan(*, instance, actor):
    _authorize(actor)
    current = _current(Plan, instance)
    before = _state(current)
    current.delete(actor=actor)
    _audit(Event.PLAN_DELETED, current, actor, before)


@system_scope
@transaction.atomic
def delete_contract(*, instance, actor):
    _authorize(actor)
    current = _current(Contract, instance)
    before = _state(current)
    current.delete(actor=actor)
    _audit(Event.CONTRACT_DELETED, current, actor, before)
