from django.utils import timezone

from .models import UserSession


def active_sessions(user):
    """Sessões em vigor da conta, da mais recente; uma query, sem escrita (a limpeza fica no login)."""
    return UserSession.objects.filter(user_id=user.pk, expires_at__gt=timezone.now()).order_by('-last_seen_at', '-id')


RECENT_LOGINS = 20


def recent_logins(user, limit=RECENT_LOGINS):
    """Últimos logins da própria conta (direito de acesso do titular, LGPD art. 18).

    Leitura explícita do registro de acesso (`unscoped`), sempre filtrada pelo dono; usa o índice
    (user, occurred_at). Falhas não têm usuário e renovações são frequentes demais: ficam fora.
    """
    from apps.audit.models import AccessLog, AccessLogAction

    return (
        AccessLog.objects.unscoped()
        .filter(user_id=user.pk, action=AccessLogAction.LOGIN_SUCCESS)
        .order_by('-occurred_at')
        .values('occurred_at', 'ip')[:limit]
    )


def mfa_status(user):
    from django.utils import timezone

    from .models import UserMfa

    device = UserMfa.objects.filter(user_id=user.pk).first()
    if device is None:
        return {'enabled': False, 'setup_pending': False, 'recovery_codes_remaining': 0}
    return {
        'enabled': device.confirmed,
        'setup_pending': not device.confirmed
        and device.setup_expires_at is not None
        and device.setup_expires_at > timezone.now(),
        'recovery_codes_remaining': device.recovery_codes.count() if device.confirmed else 0,
    }
