from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, models, transaction
from django.db.models.deletion import ProtectedError

from apps.contracts.models import Contract, Organization, Plan
from apps.core.checks import check_model_scopes
from apps.core.models import BaseModel, ContractScopedModel, SharedModel

pytestmark = pytest.mark.django_db
QUOTA_FIELDS = ('max_organizations', 'max_storage_bytes', 'max_integrations', 'max_operations_per_month')


def create_contract(**overrides):
    values = {
        'name': 'Cliente',
        'plan': Plan.objects.create(name='Plano'),
        'start_date': date(2026, 1, 1),
        'licenses': 5,
    }
    values.update(overrides)
    return Contract.objects.create(**values)


def test_models_use_declared_scopes_and_automatic_tables():
    assert issubclass(Plan, SharedModel)
    assert issubclass(Contract, BaseModel)
    assert issubclass(Organization, ContractScopedModel)
    assert not issubclass(Contract, ContractScopedModel)
    assert check_model_scopes(None) == []
    assert [model._meta.db_table for model in (Plan, Contract, Organization)] == [
        'dsc_plan',
        'dsc_contract',
        'dsc_organization',
    ]
    assert not any(field.name == 'modality' for field in Plan._meta.get_fields())


def test_plan_quotas_are_optional_and_persist_without_enforcement():
    plan = Plan.objects.create(name='Plano sem limites definidos')
    plan.full_clean()
    assert all(getattr(plan, field) is None for field in QUOTA_FIELDS)
    limits = dict(zip(QUOTA_FIELDS, (10, 20_000_000_000, 5, 10_000), strict=True))
    configured = Plan.objects.create(name='Plano com limites', **limits)
    configured.full_clean()
    configured.refresh_from_db()
    assert all(getattr(configured, field) == value for field, value in limits.items())
    contract = create_contract(plan=configured)
    for number in range(11):
        Organization.objects.create(name=f'Filial {number}', contract=contract)
    assert Organization.objects.filter(contract=contract).count() == 11  # Apenas schema, sem bloqueio de quota.


@pytest.mark.parametrize('field', QUOTA_FIELDS)
def test_zero_quota_is_distinct_from_undefined(field):
    plan = Plan.objects.create(name='Plano', **{field: 0})
    plan.full_clean()
    plan.refresh_from_db()
    assert getattr(plan, field) == 0


@pytest.mark.parametrize('field', QUOTA_FIELDS)
def test_negative_quotas_are_rejected_by_validation_and_database(field):
    plan = Plan(name='Plano', **{field: -1})
    with pytest.raises(ValidationError) as error:
        plan.full_clean()
    assert field in error.value.message_dict
    with pytest.raises(IntegrityError), transaction.atomic():
        plan.save()


@pytest.mark.parametrize('days', [0, 90, 365])
def test_contract_retention_accepts_documented_range(days):
    contract = create_contract(post_termination_retention_days=days)
    contract.full_clean()
    contract.refresh_from_db()
    assert contract.post_termination_retention_days == days


def test_contract_defaults_and_optional_end_date():
    contract = create_contract()
    contract.full_clean()
    assert contract.end_date is None
    assert contract.post_termination_retention_days == 90
    assert contract.is_active
    assert contract.public_id.version == 7


@pytest.mark.parametrize('changes', [{'licenses': 0}, {'licenses': -1}, {'post_termination_retention_days': 366}])
def test_contract_constraints_reject_invalid_values_even_in_bulk_updates(changes):
    contract = create_contract()
    for field, value in changes.items():
        setattr(contract, field, value)
    with pytest.raises(ValidationError):
        contract.full_clean()
    with pytest.raises(IntegrityError), transaction.atomic():
        Contract.objects.filter(pk=contract.pk).update(**changes)


def test_contract_date_constraint_allows_same_day_and_rejects_inverted_dates():
    contract = create_contract(start_date=date(2026, 3, 10), end_date=date(2026, 3, 10))
    contract.full_clean()
    contract.end_date -= timedelta(days=1)
    with pytest.raises(ValidationError):
        contract.full_clean()
    with pytest.raises(IntegrityError), transaction.atomic():
        contract.save()


def test_organization_requires_existing_contract_and_plan_is_required():
    with pytest.raises(IntegrityError), transaction.atomic():
        Organization.objects.create(name='Sem contrato')
    with pytest.raises(IntegrityError), transaction.atomic():
        Contract.objects.create(name='Sem plano', start_date=date(2026, 1, 1), licenses=1)


def test_context_and_plan_relations_protect_against_physical_deletion():
    contract = create_contract()
    Organization.objects.create(name='Filial', contract=contract)
    with pytest.raises(ProtectedError):
        models.Model.delete(contract)
    with pytest.raises(ProtectedError):
        models.Model.delete(contract.plan)


def test_soft_delete_preserves_related_data_and_explicit_authorship():
    actor = get_user_model().objects.create_user(username='actor')
    contract = create_contract()
    organization = Organization(name='Filial', contract=contract)
    organization.save(actor=actor)
    assert organization.created_by == actor
    assert organization.updated_by == actor
    contract.delete(actor=actor)
    assert not Contract.objects.filter(pk=contract.pk).exists()
    assert Contract.all_objects.get(pk=contract.pk).deleted_by == actor
    assert Organization.objects.get(pk=organization.pk).contract_id == contract.pk
    organization.delete(actor=actor)
    assert not Organization.objects.filter(pk=organization.pk).exists()
    assert Organization.all_objects.get(pk=organization.pk).deleted_by == actor


@pytest.mark.parametrize('quantity', [1, 30])
def test_related_names_use_constant_queries(quantity, django_assert_num_queries):
    contract = create_contract()
    Organization.objects.bulk_create(
        [Organization(name=f'Filial {number}', contract=contract) for number in range(quantity)]
    )
    with django_assert_num_queries(1):
        rows = list(Organization.objects.select_related('contract__plan'))
        assert len(rows) == quantity
        for organization in rows:
            assert str(organization).startswith('Filial')
            assert str(organization.contract) == 'Cliente'
            assert str(organization.contract.plan) == 'Plano'
