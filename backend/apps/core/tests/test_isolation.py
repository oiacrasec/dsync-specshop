"""Camada F (ADR 0006 §1.3): isolamento genérico para todo model com escopo.

Cada model concreto dos nossos apps precisa de uma fábrica em FACTORIES (ou constar em
SHARED). Model novo sem fábrica faz `test_every_model_is_covered` falhar: o isolamento
nunca fica sem teste. Os testes criam dois contratos (A e B), cada um com duas
organizações, e conferem pelos managers que um contexto não enxerga o outro.

Apps novos (inclusive de projetos derivados, ADR 0036) declaram as fábricas em
`apps/<app>/tests/isolation.py`, com `FACTORIES` e, se houver, `SHARED`; este módulo as
junta sem que o projeto edite arquivos do core.
"""

from datetime import date
from importlib import import_module
from itertools import count

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model

from apps.audit.models import AccessLog, AuditEvent, AuditEventType
from apps.contracts.models import Contract, Organization, Plan
from apps.core.models import HybridScopedModel, OrganizationScopedModel, SharedModel
from apps.core.tenancy import TenantContext, TenantContextMissing, use_context
from apps.core.tests.scoping.models import ScopingCategory, ScopingCountry, ScopingMovement, ScopingProduct
from apps.rbac.models import Assignment, AssignmentExclusion, Profile, ProfilePermission
from apps.users.models import UserMfa, UserMfaChallenge, UserRecoveryCode, UserSession

pytestmark = pytest.mark.django_db
_sequence = count()


def unique(prefix):
    return f'{prefix}-{next(_sequence)}'


def make_user(contract, organization):
    return get_user_model().objects.create_user(username=unique('user'), contract=contract)


def make_profile(contract, organization):
    return Profile.objects.create(name=unique('perfil'), contract=contract)


def make_profile_permission(contract, organization):
    return ProfilePermission.objects.create(
        profile=make_profile(contract, organization), contract=contract, permission_code='record:view'
    )


def make_assignment(contract, organization):
    user = make_user(contract, organization)
    return Assignment.objects.create(contract=contract, user=user, permission_code='record:view', scope='CONTRACT')


def make_exclusion(contract, organization):
    return AssignmentExclusion.objects.create(
        assignment=make_assignment(contract, organization), contract=contract, excluded_organization=organization
    )


def make_movement(contract, organization):
    product = ScopingProduct.objects.create(name=unique('prod'), contract=contract)
    return ScopingMovement.objects.create(contract=contract, organization=organization, product=product)


# Fábrica: (contract, organization) -> instância do contexto. Para Hybrid, contract=None cria registro do sistema.
FACTORIES = {
    Contract: None,  # Os contratos A e B do próprio cenário.
    get_user_model(): make_user,
    Organization: lambda contract, organization: Organization.objects.create(name=unique('org'), contract=contract),
    Profile: make_profile,
    ProfilePermission: make_profile_permission,
    Assignment: make_assignment,
    AssignmentExclusion: make_exclusion,
    AuditEvent: lambda contract, organization: AuditEvent.objects.create(
        event=AuditEventType.PROFILE_CREATED, contract=contract
    ),
    ScopingCategory: lambda contract, organization: ScopingCategory.objects.create(
        name=unique('cat'), contract=contract
    ),
    ScopingProduct: lambda contract, organization: ScopingProduct.objects.create(
        name=unique('prod'), contract=contract
    ),
    ScopingMovement: make_movement,
}
SHARED = {Plan, ScopingCountry}
# Registros fora dos tipos de escopo (ADR 0018): leitura só global explícita.
GLOBAL_ONLY = {AccessLog}
# Registros do próprio usuário (sessões, 9.3): sem contrato; toda leitura filtra pelo dono
# (`users.selectors.active_sessions`, `users.services.end_sessions`), coberto em test_sessions.py.
OWNER_ONLY = {UserSession, UserMfa, UserRecoveryCode, UserMfaChallenge}


def _load_app_factories():
    """Fábricas declaradas por app em `tests/isolation.py`; repetição de model é erro."""
    for config in apps.get_app_configs():
        if not config.name.startswith('apps.'):
            continue
        try:
            module = import_module(f'{config.name}.tests.isolation')
        except ModuleNotFoundError as error:
            if error.name not in (f'{config.name}.tests', f'{config.name}.tests.isolation'):
                raise
            continue
        factories = getattr(module, 'FACTORIES', {})
        repeated = FACTORIES.keys() & factories.keys()
        assert not repeated, f'Fábrica de isolamento repetida: {sorted(m._meta.label for m in repeated)}'
        FACTORIES.update(factories)
        SHARED.update(getattr(module, 'SHARED', set()))


_load_app_factories()


def own_models():
    return [
        model
        for config in apps.get_app_configs()
        if config.name.startswith('apps.')
        for model in config.get_models()
        if not model._meta.abstract and not model._meta.proxy
    ]


def test_every_model_is_covered():
    covered = FACTORIES.keys() | SHARED | GLOBAL_ONLY | OWNER_ONLY
    missing = [model._meta.label for model in own_models() if model not in covered]
    assert missing == [], f'Registre uma fábrica de isolamento para: {missing}'
    assert all(issubclass(model, SharedModel) for model in SHARED)


@pytest.fixture
def world():
    plan = Plan.objects.create(name='P')
    data = {}
    for key in ('a', 'b'):
        contract = Contract.objects.create(name=key, plan=plan, start_date=date(2020, 1, 1), licenses=50)
        main = Organization.objects.create(name=f'{key}-1', contract=contract)
        data[key] = {
            'contract': contract,
            'main': main,
            'other': Organization.objects.create(name=f'{key}-2', contract=contract),
        }
    return data


def build(model, world, key, organization='main'):
    if model is Contract:
        return world[key]['contract']
    return FACTORIES[model](world[key]['contract'], world[key][organization])


def context(world, key, organization='main'):
    return TenantContext(contract_id=world[key]['contract'].pk, organization_id=world[key][organization].pk)


def scoped_models():
    return [model for model in FACTORIES]


@pytest.mark.parametrize('model', scoped_models(), ids=lambda model: model._meta.label)
def test_context_never_sees_another_contract(model, world):
    own, foreign = build(model, world, 'a'), build(model, world, 'b')
    deleted_foreign = build(model, world, 'b')
    if model is not Contract and model is not AuditEvent:
        deleted_foreign.delete()
    with use_context(context(world, 'a')):
        for manager in (model.objects, model.all_objects):
            assert manager.filter(pk=own.pk).exists()
            assert not manager.filter(pk=foreign.pk).exists()
            assert not manager.filter(pk=deleted_foreign.pk).exists()
            assert not manager.filter(public_id=foreign.public_id).exists()
            with pytest.raises(model.DoesNotExist):
                manager.get(pk=foreign.pk)
            assert foreign.pk not in set(manager.values_list('pk', flat=True))


@pytest.mark.parametrize(
    'model', [model for model in FACTORIES if issubclass(model, OrganizationScopedModel)], ids=lambda m: m._meta.label
)
def test_organization_context_never_sees_another_organization_of_the_same_contract(model, world):
    own, sibling = build(model, world, 'a', 'main'), build(model, world, 'a', 'other')
    with use_context(context(world, 'a', 'main')):
        assert model.objects.filter(pk=own.pk).exists()
        assert not model.all_objects.filter(pk=sibling.pk).exists()


@pytest.mark.parametrize(
    'model', [model for model in FACTORIES if issubclass(model, HybridScopedModel)], ids=lambda m: m._meta.label
)
def test_hybrid_system_records_are_shared_but_other_clients_are_not(model, world):
    system = FACTORIES[model](None, world['a']['main'])
    foreign = build(model, world, 'b')
    with use_context(context(world, 'a')):
        assert model.objects.filter(pk=system.pk).exists()
        assert not model.objects.filter(pk=foreign.pk).exists()


@pytest.mark.parametrize('model', scoped_models(), ids=lambda model: model._meta.label)
def test_scoped_queries_fail_closed_without_context(model, world):
    build(model, world, 'a')
    for missing in (None, TenantContext(superuser=True)):
        with use_context(missing), pytest.raises(TenantContextMissing):
            model.objects.exists()
    with use_context(None):
        assert model.objects.unscoped().exists()  # Global só quando pedido explicitamente.


@pytest.mark.parametrize('model', sorted(SHARED, key=lambda m: m._meta.label), ids=lambda m: m._meta.label)
def test_shared_models_are_visible_in_any_context(model, world):
    record = model.objects.create(name=unique('shared'))
    for any_context in (None, context(world, 'a'), context(world, 'b')):
        with use_context(any_context):
            assert model.objects.filter(pk=record.pk).exists()


@pytest.mark.parametrize('model', sorted(GLOBAL_ONLY, key=lambda m: m._meta.label), ids=lambda m: m._meta.label)
def test_global_only_records_are_read_only_in_system_context(model, world):
    AccessLog(ip='203.0.113.7', contract=world['a']['contract']).save()
    for any_context in (None, context(world, 'a'), TenantContext(superuser=True)):
        with use_context(any_context), pytest.raises(TenantContextMissing):
            model.objects.exists()
    with use_context(None):
        assert model.objects.unscoped().count() == 1
    assert model.objects.count() == 1  # system_context do conftest.
