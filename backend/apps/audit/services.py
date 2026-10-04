"""Registro de eventos de auditoria (ADR 0009 §6-§7, ADR 0017).

Mudanças de permissão e de contas de superadmin são gravadas na mesma transação da
mudança: se ela for desfeita, o evento também é. A entrada do superadmin em organização
é gravada pelo middleware, fora da transação da view.
"""

from apps.core.tenancy import get_context

from .models import AccessLog, AccessLogAction, AuditEvent, AuditEventType
from .utils import client_address


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
    AuditEvent.objects.unscoped().bulk_create([entry], ignore_conflicts=True)


def record_access(request, *, action, user, occurred_at):
    """Grava autenticação após a view, fora da sua transação (ADR 0019).

    Falhas não associam a tentativa à conta digitada. Sucessos recebem o usuário
    validado pelo serviço, sem consultar novamente ou armazenar credenciais.
    """
    ip, port = client_address(request)
    context = get_context()
    tenant = context if context is not None and not context.system else None
    known_user = user if user is not None and user.is_authenticated else None
    # Sem contexto (ex.: login), o contrato é o do próprio usuário identificado.
    contract_id = tenant.contract_id if tenant else getattr(known_user, 'contract_id', None)
    access = AccessLog(
        action=AccessLogAction(action),
        occurred_at=occurred_at,
        ip=ip,
        port=port,
        user=known_user,
        contract_id=contract_id,
        organization_id=tenant.organization_id if tenant else None,
        request_id=getattr(request, 'request_id', None),
    )
    access.save()  # Inserção direta: o manager só lê em system_context().
    return access
