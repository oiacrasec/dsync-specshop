"""Registro de eventos de auditoria (ADR 0009 §6-§7, ADR 0017).

Mudanças de permissão e de contas de superadmin são gravadas na mesma transação da
mudança: se ela for desfeita, o evento também é. A entrada do superadmin em organização
é gravada pelo middleware, fora da transação da view.
"""

from .models import AuditEvent, AuditEventType


def record(event, *, actor, contract_id=None, organization_id=None, target=None, before=None, after=None, **extra):
    """Grava um evento. `target` é a instância alterada (tipo e public_id vão para o evento)."""
    changes = {'before': before, 'after': after, **extra}
    audit = AuditEvent(
        event=event,
        contract_id=contract_id,
        context_organization_id=organization_id,
        target_type=target._meta.label_lower if target is not None else '',
        target_public_id=target.public_id if target is not None else None,
        changes=changes,
    )
    audit.save(actor=actor)
    return audit


def record_superadmin_entry(*, superadmin, organization, access_jti=''):
    """Uma linha por superadmin + organização + access token (ON CONFLICT DO NOTHING)."""
    entry = AuditEvent(
        event=AuditEventType.SUPERADMIN_ENTERED_ORGANIZATION,
        contract_id=organization.contract_id,
        context_organization=organization,
        target_type=organization._meta.label_lower,
        target_public_id=organization.public_id,
        access_jti=access_jti,
        created_by=superadmin,
        updated_by=superadmin,
    )
    AuditEvent.objects.bulk_create([entry], ignore_conflicts=True)
