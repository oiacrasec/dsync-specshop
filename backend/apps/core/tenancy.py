"""Contexto de tenant por requisição (ADR 0006 §1.3, camada C; etapa 2.4).

Um `contextvar` guarda contrato, organização e se o usuário é superadmin. O
`TenantContextMiddleware` (`apps/core/middleware.py`) começa cada requisição sem
contexto; as classes de permissão do DRF preenchem o contrato do usuário e o header
preenche a organização. Fora de requisição (services
do superadmin, comandos, tarefas), o código define o contexto explicitamente com
`use_context(...)` ou `system_context()`.

Sem contexto, os managers com escopo levantam `TenantContextMissing` (fail closed).
"""

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, replace
from functools import wraps


class TenantContextMissing(RuntimeError):
    """Query com escopo sem contexto: erro de programação, nunca devolve dados."""


@dataclass(frozen=True, slots=True)
class TenantContext:
    contract_id: int | None = None
    organization_id: int | None = None
    superuser: bool = False
    system: bool = False  # Acesso global explícito (system_context).


SYSTEM = TenantContext(system=True)
_current: ContextVar[TenantContext | None] = ContextVar('dsc_tenant_context', default=None)


def get_context():
    return _current.get()


def set_context(context):
    """Troca o contexto atual; devolve o token para `reset_context`."""
    return _current.set(context)


def reset_context(token):
    _current.reset(token)


def update_context(**changes):
    _current.set(replace(_current.get() or TenantContext(), **changes))


@contextmanager
def use_context(context):
    token = _current.set(context)
    try:
        yield context
    finally:
        _current.reset(token)


def system_context():
    """Bloco com acesso global explícito: services do superadmin, comandos e testes."""
    return use_context(SYSTEM)


def system_scope(function):
    """Decorator: executa o service inteiro em `system_context()`.

    Para services de integridade (licenças, último admin, RBAC do superadmin), que
    precisam enxergar o banco inteiro; a autorização fica em quem chama.
    """

    @wraps(function)
    def wrapper(*args, **kwargs):
        with system_context():
            return function(*args, **kwargs)

    return wrapper
