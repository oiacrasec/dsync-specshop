"""Auxiliares da auditoria, sem acesso ao banco."""

ENTRY_ATTRIBUTE = '_dsc_superadmin_entry'


def mark_superadmin_entry(request, organization):
    """Marca a entrada do superadmin ao resolver o contexto; o middleware grava após a resposta."""
    django_request = getattr(request, '_request', request)
    auth = getattr(request, 'auth', None)
    jti = str(auth.get('jti', '')) if auth is not None and hasattr(auth, 'get') else ''
    setattr(django_request, ENTRY_ATTRIBUTE, (request.user, organization, jti))
