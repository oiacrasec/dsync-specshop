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
