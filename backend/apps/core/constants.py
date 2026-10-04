"""Constantes do core: só valores literais, sem importar código do app."""

from django.utils.translation import gettext_lazy as _

# Contexto (ADR 0006 §3).
ORGANIZATION_HEADER = 'X-Organization-Id'

# Erros RFC 9457 (ADR 0004).
PROBLEM_CONTENT_TYPE = 'application/problem+json'
PROBLEM_TYPE_PREFIX = 'urn:datasync:problem:'
# Mensagens estáveis; não repassar texto de exceções de infraestrutura ao cliente.
HTTP_PROBLEMS = {
    400: ('malformed-request', _('Requisição malformada'), _('Verifique a sintaxe da requisição.')),
    401: (
        'authentication-required',
        _('Autenticação necessária'),
        _('Informe credenciais válidas para acessar este recurso.'),
    ),
    403: (
        'permission-denied',
        _('Acesso negado'),
        _('Você não tem permissão para acessar este recurso.'),
    ),
    404: ('not-found', _('Recurso não encontrado'), _('O recurso solicitado não foi encontrado.')),
    422: ('validation-error', _('Dados inválidos'), _('Corrija os campos indicados em errors.')),
}

# Escopo declarado: exceções da lista fechada do ADR 0012.
SCOPE_EXCEPTIONS = frozenset({'users.User', 'contracts.Contract'})
# Registros fora do BaseModel e dos tipos de escopo (ADR 0018): só inserção, leitura global explícita.
UNSCOPED_RECORDS = frozenset({'audit.AccessLog'})

# Serializer com escopo: contexto e id interno nunca entram nem saem (ADR 0006 §4, ADR 0007).
SERIALIZER_HIDDEN_FIELDS = ('id', 'contract', 'organization')
