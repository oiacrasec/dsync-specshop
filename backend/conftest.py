from datetime import date

import pytest

from apps.contracts.models import Contract, Plan
from apps.core.tenancy import system_context


@pytest.fixture(autouse=True)
def tenant_system_context():
    """Arrange e asserts dos testes com acesso global explícito (decisão 3 da 2.4).

    Requisições pelo APIClient passam pelo TenantContextMiddleware, que começa sem
    contexto: o caminho real das views continua testado. Testes de isolamento usam
    use_context(...) para trocar o contexto.
    """
    with system_context():
        yield


@pytest.fixture
def user_contract(db):
    """Contrato explícito para os testes de usuários comuns, sem defaults no runtime."""
    return Contract.objects.create(
        name='Cliente de teste',
        plan=Plan.objects.create(name='Plano de teste'),
        start_date=date(2020, 1, 1),
        licenses=100,
    )


@pytest.fixture
def essential_profile(db):
    """Perfil essencial criado pela migration rbac.0002 (não criar outro: a chave é única)."""
    from apps.rbac.models import Profile

    return Profile.objects.get(system_key='contract_admin', contract__isnull=True)
