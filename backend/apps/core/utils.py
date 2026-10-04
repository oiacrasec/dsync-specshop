"""Auxiliares do core, sem regra de negócio nem escrita no banco.

Os imports de models são tardios: `managers` usa `scope_filter` e é importado por `models`.
"""

from django.db import models

from .tenancy import TenantContextMissing, get_context


def scope_filter(model):
    """Condição do contexto atual para o model; None = sem filtro (ADR 0006 §1.1, ADR 0012).

    Sem contexto, ou sem o contrato/organização que o tipo exige, levanta
    TenantContextMissing. Superadmin sem organização precisa de `unscoped()`.
    """
    from .models import ContractScopedModel, HybridScopedModel, OrganizationScopedModel, SharedModel

    if issubclass(model, SharedModel):
        return None
    context = get_context()
    if context is None:
        raise TenantContextMissing(f'{model._meta.label} consultado sem contexto de tenant.')
    if context.system:
        return None
    if context.contract_id is None:
        raise TenantContextMissing(f'{model._meta.label} exige contrato no contexto (use unscoped()).')
    label = model._meta.label
    if label == 'contracts.Contract':
        return models.Q(pk=context.contract_id)
    if label == 'users.User':
        return models.Q(contract_id=context.contract_id)
    if issubclass(model, OrganizationScopedModel):
        if context.organization_id is None:
            raise TenantContextMissing(f'{label} exige organização no contexto.')
        return models.Q(contract_id=context.contract_id, organization_id=context.organization_id)
    if issubclass(model, ContractScopedModel):
        return models.Q(contract_id=context.contract_id)
    if issubclass(model, HybridScopedModel):
        return models.Q(contract_id=context.contract_id) | models.Q(contract__isnull=True)
    raise TenantContextMissing(f'{label} sem tipo de escopo conhecido.')


def context_values(model):
    """`contract_id`/`organization_id` do contexto validado para o tipo de escopo do model (camada D)."""
    from .models import ContractScopedModel, HybridScopedModel, OrganizationScopedModel

    context = get_context()
    if context is None or context.contract_id is None:
        raise TenantContextMissing(f'{model._meta.label} exige contrato no contexto para gravar.')
    if issubclass(model, OrganizationScopedModel):
        if context.organization_id is None:
            raise TenantContextMissing(f'{model._meta.label} exige organização no contexto para gravar.')
        return {'contract_id': context.contract_id, 'organization_id': context.organization_id}
    if issubclass(model, ContractScopedModel | HybridScopedModel):
        return {'contract_id': context.contract_id}
    return {}


def fetch_all(cursor):
    """Linhas do último resultado como dicionários (SQL com vários comandos num `execute`).

    O cursor começa no resultado do 1º comando; avança até o último antes de ler.
    """
    while cursor.nextset():
        pass
    if cursor.description is None:
        return []
    columns = [column.name for column in cursor.description]
    return [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]
