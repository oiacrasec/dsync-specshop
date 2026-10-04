"""Leituras de contratos e organizações."""

from apps.core.selectors import BaseAdminModelSelector

from .models import Contract, Organization, Plan


def superadmin_contracts(search=None):
    """Busca do superadmin, 1º passo (ADR 0009 §6): contratos não excluídos, por nome.

    Inclui inativos e vencidos para suporte; se a entrada é permitida decide a etapa 2.3.
    """
    contracts = Contract.objects.unscoped().order_by('name', 'pk')  # Busca global do superadmin.
    if search:
        contracts = contracts.filter(name__icontains=search)
    return contracts


def superadmin_contract_organizations(contract):
    """2º passo: organizações ativas e não excluídas do contrato escolhido."""
    return Organization.objects.unscoped().filter(contract=contract, is_active=True).order_by('name', 'pk')


class PlanSelector(BaseAdminModelSelector):
    model = Plan


class ContractSelector(BaseAdminModelSelector):
    model = Contract
    select_related = ('plan',)
