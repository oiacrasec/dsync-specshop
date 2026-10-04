from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.contracts.models import Contract, Organization, Plan
from apps.contracts.selectors import superadmin_contract_organizations, superadmin_contracts
from apps.core import permission_registry
from apps.core.permission_registry import PermissionDefinition, PermissionRegistry, PermissionScope
from apps.rbac import services
from apps.rbac.models import Assignment, Profile
from apps.rbac.selectors import accessible_organizations
from apps.rbac.tests.test_permissions import assign, profile_with

pytestmark = pytest.mark.django_db
URL = '/api/v1/me/organizations/'


@pytest.fixture(autouse=True)
def business_registry(monkeypatch):
    registry = PermissionRegistry(
        [
            PermissionDefinition('record:view', frozenset(PermissionScope)),
            PermissionDefinition('record:create', frozenset(PermissionScope)),
            *list(permission_registry.PERMISSIONS),
        ]
    )
    monkeypatch.setattr(permission_registry, 'PERMISSIONS', registry)
    monkeypatch.setattr(services, 'PERMISSIONS', registry)


@pytest.fixture
def admin():
    return get_user_model().objects.create_superuser(username='admin')


@pytest.fixture
def maria(user_contract):
    return get_user_model().objects.create_user(username='maria', contract=user_contract)


@pytest.fixture
def orgs(user_contract):
    names = ('saude', 'obras', 'educacao')
    return {name: Organization.objects.create(name=name, contract=user_contract) for name in names}


def names(user):
    return list(accessible_organizations(user).values_list('name', flat=True))


def test_without_grants_no_organization(maria, orgs):
    assert names(maria) == []


def test_contract_grant_reaches_active_organizations_of_own_contract_only(admin, maria, orgs, user_contract):
    Organization.objects.create(name='inativa', contract=user_contract, is_active=False)
    Organization.objects.create(name='excluida', contract=user_contract).delete()
    other = Contract.objects.create(
        name='Outro', plan=Plan.objects.create(name='P'), start_date=date(2020, 1, 1), licenses=1
    )
    Organization.objects.create(name='alheia', contract=other)
    assign(admin, maria, code='record:view')
    assert names(maria) == ['educacao', 'obras', 'saude']  # Ordem por nome.


def test_exclusions_and_combination_of_grants(admin, maria, orgs, user_contract):
    viewer = profile_with(admin, user_contract, 'Leitor', 'record:view')
    assign(admin, maria, profile=viewer, excluded=[orgs['saude'], orgs['obras']])
    assert names(maria) == ['educacao']
    assign(admin, maria, code='record:create', excluded=[orgs['saude']])  # Devolve obras.
    assert names(maria) == ['educacao', 'obras']
    assign(admin, maria, code='record:create', organization=orgs['saude'])  # Direta devolve saúde.
    assert names(maria) == ['educacao', 'obras', 'saude']


def test_organization_grant_reaches_only_its_organization(admin, maria, orgs):
    assign(admin, maria, code='record:view', organization=orgs['obras'])
    assert names(maria) == ['obras']


def test_inactive_assignment_or_profile_gives_no_access(admin, maria, orgs, user_contract):
    viewer = profile_with(admin, user_contract, 'Leitor', 'record:view')
    assign(admin, maria, profile=viewer)
    Profile.objects.filter(pk=viewer.pk).update(is_active=False)
    direct = assign(admin, maria, code='record:view', organization=orgs['obras'])
    Assignment.objects.filter(pk=direct.pk).update(is_active=False)
    assert names(maria) == []


def test_essential_profile_reaches_every_organization(admin, maria, orgs, essential_profile):
    assign(admin, maria, profile=essential_profile)
    assert names(maria) == ['educacao', 'obras', 'saude']


def test_endpoint_lists_without_context_header(admin, maria, orgs):
    assign(admin, maria, code='record:view', organization=orgs['obras'])
    client = APIClient()
    client.force_authenticate(maria)
    response = client.get(URL)
    assert response.status_code == 200
    assert response.json() == [{'public_id': str(orgs['obras'].public_id), 'name': 'obras'}]
    assert 'no-cache' in response['Cache-Control']


def test_endpoint_requires_authentication():
    assert APIClient().get(URL).status_code == 401


def test_superadmin_gets_empty_list(admin, orgs):
    client = APIClient()
    client.force_authenticate(admin)
    assert client.get(URL).json() == []


def test_endpoint_queries_do_not_grow_with_organizations(admin, maria, user_contract):
    viewer = profile_with(admin, user_contract, 'Leitor', 'record:view')
    assign(admin, maria, profile=viewer)
    client = APIClient()
    client.force_authenticate(maria)
    counts = []
    for total in (1, 30):
        Organization.objects.bulk_create(
            Organization(name=f'org-{total}-{index}', contract=user_contract) for index in range(total)
        )
        with CaptureQueriesContext(connection) as context:
            client.get(URL)
        counts.append(sum(query['sql'].startswith('SELECT') for query in context.captured_queries))
    assert counts == [4, 4]  # Atribuições, permissões do perfil, exceções e organizações.


def test_superadmin_search_contract_then_organization(user_contract, orgs):
    plan = Plan.objects.create(name='P')
    Contract.objects.create(name='Prefeitura X', plan=plan, start_date=date(2020, 1, 1), licenses=1)
    Contract.objects.create(name='Apagado', plan=plan, start_date=date(2020, 1, 1), licenses=1).delete()
    inactive = Contract.objects.create(
        name='Prefeitura Y', plan=plan, start_date=date(2020, 1, 1), licenses=1, is_active=False
    )
    assert list(superadmin_contracts('prefeitura').values_list('name', flat=True)) == ['Prefeitura X', 'Prefeitura Y']
    assert superadmin_contracts().count() == 3
    assert inactive in superadmin_contracts()
    orgs['obras'].is_active = False
    orgs['obras'].save()
    assert list(superadmin_contract_organizations(user_contract).values_list('name', flat=True)) == [
        'educacao',
        'saude',
    ]
