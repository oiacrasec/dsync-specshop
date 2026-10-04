"""Auxiliares da auditoria, sem regra de negócio nem escrita no banco."""

from .constants import ENTRY_ATTRIBUTE


def mark_superadmin_entry(request, organization):
    """Marca a entrada do superadmin ao resolver o contexto; o middleware grava após a resposta."""
    django_request = getattr(request, '_request', request)
    auth = getattr(request, 'auth', None)
    jti = str(auth.get('jti', '')) if auth is not None and hasattr(auth, 'get') else ''
    setattr(django_request, ENTRY_ATTRIBUTE, (request.user, organization, jti))


def snapshot(instance, fields):
    """Foto dos campos auditados ({nome: caminho ORM}) para o before/after (ADR 0017).

    Uma query. UUIDs (FKs pelo public_id) viram texto para caber no JSON. Usa
    `all_objects`: quem chama define o contexto (os services rodam em system_scope).
    """
    row = type(instance).all_objects.filter(pk=instance.pk).values(*fields.values()).get()
    return {name: str(row[path]) if hasattr(row[path], 'hex') else row[path] for name, path in fields.items()}
