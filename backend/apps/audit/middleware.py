from .services import record_superadmin_entry
from .utils import ENTRY_ATTRIBUTE


class SuperadminEntryAuditMiddleware:
    """Grava a entrada do superadmin fora do ATOMIC_REQUESTS da view.

    Assim o registro sobrevive a erros e respostas 4xx/5xx da própria requisição
    (ADR 0009 §6: toda entrada do superadmin em organização de cliente é registrada).
    A marcação é feita por `apps.audit.utils.mark_superadmin_entry`.
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
