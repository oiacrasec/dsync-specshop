from .services import record_superadmin_entry

ENTRY_ATTRIBUTE = '_dsc_superadmin_entry'


def mark_superadmin_entry(request, organization):
    """Chamado ao resolver o contexto; o registro acontece depois da resposta."""
    django_request = getattr(request, '_request', request)
    auth = getattr(request, 'auth', None)
    jti = str(auth.get('jti', '')) if auth is not None and hasattr(auth, 'get') else ''
    setattr(django_request, ENTRY_ATTRIBUTE, (request.user, organization, jti))


class SuperadminEntryAuditMiddleware:
    """Grava a entrada do superadmin fora do ATOMIC_REQUESTS da view.

    Assim o registro sobrevive a erros e respostas 4xx/5xx da própria requisição
    (ADR 0009 §6: toda entrada do superadmin em organização de cliente é registrada).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        entry = getattr(request, ENTRY_ATTRIBUTE, None)
        if entry is not None:
            superadmin, organization, jti = entry
            record_superadmin_entry(superadmin=superadmin, organization=organization, access_jti=jti)
        return response
