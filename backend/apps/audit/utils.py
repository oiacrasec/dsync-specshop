"""Auxiliares da auditoria, sem regra de negócio nem escrita no banco."""

from ipaddress import ip_address

from django.conf import settings
from django.utils import timezone

from .constants import AUTH_ACCESS_ATTRIBUTE, ENTRY_ATTRIBUTE


def mark_superadmin_entry(request, organization):
    """Marca a entrada do superadmin ao resolver o contexto; o middleware grava após a resposta."""
    django_request = getattr(request, '_request', request)
    auth = getattr(request, 'auth', None)
    jti = str(auth.get('jti', '')) if auth is not None and hasattr(auth, 'get') else ''
    setattr(django_request, ENTRY_ATTRIBUTE, (request.user, organization, jti))


def mark_auth_access(request, *, action, user=None):
    """Transporta o evento até o middleware, sem escrita nem credenciais (ADR 0019)."""
    django_request = getattr(request, '_request', request)
    setattr(django_request, AUTH_ACCESS_ATTRIBUTE, (action, user, timezone.now()))


def snapshot(instance, fields):
    """Foto dos campos auditados ({nome: caminho ORM}) para o before/after (ADR 0017).

    Uma query. UUIDs (FKs pelo public_id) viram texto para caber no JSON. Usa
    `all_objects`: quem chama define o contexto (os services rodam em system_scope).
    """
    row = type(instance).all_objects.filter(pk=instance.pk).values(*fields.values()).get()
    return {name: str(row[path]) if hasattr(row[path], 'hex') else row[path] for name, path in fields.items()}


def _valid_ip(value):
    try:
        return str(ip_address(value.strip()))
    except ValueError, AttributeError:
        return None


def _valid_port(value):
    try:
        port = int(str(value).strip())
    except TypeError, ValueError:
        return None
    return port if 0 < port <= 65535 else None


def client_address(request):
    """IP e porta de origem do cliente (Marco Civil art. 15; porta por causa do CGNAT).

    Atrás do proxy reverso, lê os headers configurados (ex.: X-Real-IP/X-Real-Port,
    preenchidos pelo nginx com $remote_addr/$remote_port). Sem configuração, ou se o
    header faltar ou for inválido, usa a conexão direta (REMOTE_ADDR/REMOTE_PORT).
    """
    ip_header = settings.ACCESS_LOG_CLIENT_IP_HEADER
    port_header = settings.ACCESS_LOG_CLIENT_PORT_HEADER
    ip = _valid_ip(request.headers.get(ip_header, '')) if ip_header else None
    port = _valid_port(request.headers.get(port_header)) if port_header else None
    if ip is None:
        ip = _valid_ip(request.META.get('REMOTE_ADDR', '')) or '0.0.0.0'  # noqa: S104 — origem desconhecida.
    if port is None:
        port = _valid_port(request.META.get('REMOTE_PORT'))
    return ip, port
