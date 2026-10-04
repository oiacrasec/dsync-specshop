"""Leituras de contratos e organizações."""

from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError

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


def admin_plans():
    return Plan.objects.unscoped()


def admin_contracts():
    return Contract.objects.unscoped().select_related('plan')


def admin_listing(queryset, *, ordering_fields, first, rows, search='', ordering='name', is_active=None, plan=None):
    """Lista permitida; SQL parametrizado e página limitada pelo serializer."""
    fields = ordering.split(',')
    if any(field.removeprefix('-') not in ordering_fields for field in fields):
        raise ValidationError({'ordering': _('Informe campos de ordenação permitidos.')})
    if search:
        queryset = queryset.filter(name__icontains=search)
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)
    if plan is not None:
        if queryset.model is not Contract:
            raise ValidationError({'plan': _('Este filtro só está disponível para contratos.')})
        queryset = queryset.filter(plan__public_id=plan)
    queryset = queryset.order_by(*fields, 'public_id')
    return queryset[first : first + rows], queryset.count()
