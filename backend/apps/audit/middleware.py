from .constants import ACCESS_LOG_PATH_PREFIX, ENTRY_ATTRIBUTE
from .services import record_access, record_superadmin_entry


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


class AccessLogMiddleware:
    """Registro de acesso de toda requisição à API, inclusive anônima e com erro (ADR 0018).

    Grava após a resposta, fora do ATOMIC_REQUESTS da view, ainda com o contexto de
    tenant da requisição (fica depois do TenantContextMiddleware na lista).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path_info.startswith(ACCESS_LOG_PATH_PREFIX):
            record_access(request)
        return response
