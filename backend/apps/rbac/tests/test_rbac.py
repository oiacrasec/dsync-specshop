from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, close_old_connections, transaction
from django.utils import timezone

from apps.contracts.models import Contract, Organization
from apps.core.checks import check_model_scopes
from apps.core.exceptions import LastContractAdmin, ProfileInUse
from apps.core.permission_registry import PermissionDefinition, PermissionRegistry, PermissionScope
from apps.core.tenancy import system_scope
from apps.rbac import services
from apps.rbac.models import Assignment, AssignmentExclusion, Profile, ProfilePermission
from apps.users.services import save_user

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin():
    return get_user_model().objects.create_superuser(username='admin')


@pytest.fixture
def common(user_contract):
    return get_user_model().objects.create_user(username='common', contract=user_contract)


@pytest.fixture
def other_contract(user_contract):
    return Contract.objects.create(
        name='Outro', plan=user_contract.plan, start_date=user_contract.start_date, licenses=100
    )


@pytest.fixture
def profile(user_contract):
    return Profile.objects.create(name='Leitor', contract=user_contract)


@pytest.fixture
def organization(user_contract):
    return Organization.objects.create(name='Matriz', contract=user_contract)


@pytest.fixture
def business_registry(monkeypatch):
    """Catálogo só de teste; não cadastra domínio futuro no produto."""
    registry = PermissionRegistry(
        [
            PermissionDefinition('record:view', frozenset(PermissionScope)),
            PermissionDefinition('record:contract', frozenset({PermissionScope.CONTRACT})),
            *list(services.PERMISSIONS),
        ]
    )
    monkeypatch.setattr(services, 'PERMISSIONS', registry)
    return registry


def grant(common, profile, **overrides):
    values = {'contract_id': common.contract_id, 'user': common, 'profile': profile, 'scope': 'CONTRACT'}
    values.update(overrides)
    return Assignment(**values)


def test_rbac_models_declare_scope_and_use_public_uuid(profile, common):
    assert check_model_scopes(None) == []
    assert profile.public_id.version == 7
    assert profile._meta.db_table == 'dsc_profile'
    assert Assignment._meta.db_table == 'dsc_assignment'
    assert ProfilePermission._meta.db_table == 'dsc_profile_permission'
    assert AssignmentExclusion._meta.db_table == 'dsc_assignment_exclusion'


def test_client_profile_names_conflict_with_own_contract_and_system(admin, user_contract, other_contract):
    services.save_profile(profile=Profile(name='Leitor', contract=user_contract), actor=admin)
    with pytest.raises(ValidationError):
        services.save_profile(profile=Profile(name='Leitor', contract=user_contract), actor=admin)
    services.save_profile(profile=Profile(name='Leitor', contract=other_contract), actor=admin)
    system, affected = services.save_profile(profile=Profile(name='Leitor'), actor=admin)
    assert set(affected) == {user_contract.public_id, other_contract.public_id}
    assert system.contract_id is None
    with pytest.raises(ValidationError):
        services.save_profile(profile=Profile(name='Leitor', contract=user_contract), actor=admin)
    with pytest.raises(ValidationError):
        services.save_profile(profile=Profile(name='Leitor'), actor=admin)


def test_profile_name_uniqueness_in_database_includes_system_null_contract(user_contract):
    Profile.objects.create(name='Sistema')
    with pytest.raises(IntegrityError), transaction.atomic():
        Profile.objects.create(name='Sistema')
    Profile.objects.create(name='Cliente', contract=user_contract)
    with pytest.raises(IntegrityError), transaction.atomic():
        Profile.objects.create(name='Cliente', contract=user_contract)


def test_client_profile_cannot_move_between_contracts(profile, other_contract, admin):
    profile.contract = other_contract
    with pytest.raises(ValidationError):
        services.save_profile(profile=profile, actor=admin)


@pytest.mark.parametrize('operation', ['create', 'edit', 'delete', 'permission'])
def test_essential_profile_is_protected_outside_fixture(operation, admin, essential_profile):
    essential = essential_profile
    with pytest.raises(PermissionDenied):
        if operation == 'create':
            services.save_profile(profile=Profile(name='Essential', system_key='contract_admin'), actor=admin)
        elif operation == 'edit':
            essential.system_key = ''
            services.save_profile(profile=essential, actor=admin)
        elif operation == 'delete':
            services.delete_profile(profile=essential, actor=admin)
        else:
            services.save_profile_permission(
                permission=ProfilePermission(profile=essential, permission_code='user:create'), actor=admin
            )


def test_system_key_cannot_be_used_by_client_profile(user_contract):
    with pytest.raises(IntegrityError), transaction.atomic():
        Profile.objects.create(name='Essential', system_key='contract_admin', contract=user_contract)


@pytest.mark.parametrize('code', ['unknown:view', 'user:create'])
def test_unknown_and_reserved_permissions_cannot_enter_normal_profile(profile, admin, code):
    with pytest.raises(ValidationError):
        services.save_profile_permission(
            permission=ProfilePermission(profile=profile, contract=profile.contract, permission_code=code), actor=admin
        )


def test_profile_permission_must_match_profile_context(profile, admin, other_contract, business_registry):
    with pytest.raises(ValidationError):
        services.save_profile_permission(
            permission=ProfilePermission(profile=profile, contract=other_contract, permission_code='record:view'),
            actor=admin,
        )
    permission = ProfilePermission(profile=profile, contract=profile.contract, permission_code='record:view')
    services.save_profile_permission(permission=permission, actor=admin)
    assert permission.created_by == admin
    assert permission.updated_by == admin
    services.delete_profile_permission(permission=permission, actor=admin)
    assert not ProfilePermission.objects.filter(pk=permission.pk).exists()


@pytest.mark.parametrize('kind', ['user', 'profile', 'organization'])
def test_cross_contract_assignment_is_rejected(kind, common, profile, organization, other_contract, admin):
    assignment = grant(common, profile)
    if kind == 'user':
        assignment.contract = other_contract
    elif kind == 'profile':
        assignment.profile = Profile.objects.create(name='Outro perfil', contract=other_contract)
    else:
        assignment.scope = 'ORGANIZATION'
        assignment.scope_organization = Organization.objects.create(name='Outra filial', contract=other_contract)
    with pytest.raises(ValidationError):
        services.save_assignment(assignment=assignment, actor=admin)
    assert Assignment.objects.count() == 0


@pytest.mark.parametrize('kind', ['both', 'neither', 'contract-with-org', 'org-without-org', 'invalid-scope'])
def test_assignment_constraints_enforced_in_database(kind, common, profile, organization):
    assignment = grant(common, profile)
    if kind == 'both':
        assignment.permission_code = 'record:view'
    elif kind == 'neither':
        assignment.profile = None
    elif kind == 'contract-with-org':
        assignment.scope_organization = organization
    elif kind == 'org-without-org':
        assignment.scope = 'ORGANIZATION'
    else:
        assignment.scope = 'GLOBAL'
    with pytest.raises(IntegrityError), transaction.atomic():
        assignment.save()


def test_duplicate_assignments_with_null_fields_are_rejected(common, profile, admin):
    services.save_assignment(assignment=grant(common, profile), actor=admin)
    with pytest.raises(IntegrityError), transaction.atomic():
        grant(common, profile).save()


@pytest.mark.parametrize('code', ['unknown:view', 'user:create'])
def test_unknown_and_reserved_individual_grants_are_rejected(common, admin, code):
    with pytest.raises(ValidationError):
        services.save_assignment(
            assignment=Assignment(user=common, contract=common.contract, permission_code=code, scope='CONTRACT'),
            actor=admin,
        )


def test_profile_permission_scope_is_checked_on_assignment_and_on_later_profile_change(
    common, profile, organization, admin, business_registry
):
    permission = ProfilePermission(profile=profile, contract=profile.contract, permission_code='record:contract')
    services.save_profile_permission(permission=permission, actor=admin)
    with pytest.raises(ValidationError):
        services.save_assignment(
            assignment=grant(common, profile, scope='ORGANIZATION', scope_organization=organization), actor=admin
        )
    services.delete_profile_permission(permission=permission, actor=admin)
    services.save_assignment(
        assignment=grant(common, profile, scope='ORGANIZATION', scope_organization=organization), actor=admin
    )
    with pytest.raises(ValidationError):
        services.save_profile_permission(
            permission=ProfilePermission(profile=profile, contract=profile.contract, permission_code='record:contract'),
            actor=admin,
        )


def test_exclusion_has_same_contract_and_requires_contract_scope(common, profile, organization, other_contract, admin):
    assignment = services.save_assignment(assignment=grant(common, profile), actor=admin)
    other_org = Organization.objects.create(name='Outra filial', contract=other_contract)
    with pytest.raises(ValidationError):
        services.save_exclusion(
            exclusion=AssignmentExclusion(
                assignment=assignment, contract=common.contract, excluded_organization=other_org
            ),
            actor=admin,
        )
    exclusion = services.save_exclusion(
        exclusion=AssignmentExclusion(
            assignment=assignment, contract=common.contract, excluded_organization=organization
        ),
        actor=admin,
    )
    assert exclusion.created_by == admin
    assignment.scope = 'ORGANIZATION'
    assignment.scope_organization = organization
    with pytest.raises(ValidationError):
        services.save_assignment(assignment=assignment, actor=admin)
    services.delete_exclusion(exclusion=exclusion, actor=admin)
    services.save_assignment(assignment=assignment, actor=admin)
    with pytest.raises(ValidationError):
        services.save_exclusion(
            exclusion=AssignmentExclusion(
                assignment=assignment, contract=common.contract, excluded_organization=organization
            ),
            actor=admin,
        )


def test_essential_assignment_requires_contract_without_exclusions(common, organization, admin, essential_profile):
    essential = essential_profile
    assignment = services.save_assignment(assignment=grant(common, essential), actor=admin)
    with pytest.raises(ValidationError):
        services.save_exclusion(
            exclusion=AssignmentExclusion(
                assignment=assignment, contract=common.contract, excluded_organization=organization
            ),
            actor=admin,
        )
    with pytest.raises(ValidationError):
        services.save_assignment(
            assignment=grant(common, essential, scope='ORGANIZATION', scope_organization=organization), actor=admin
        )
    with pytest.raises(LastContractAdmin):  # Etapa 3.4: proteção do último administrador.
        services.delete_assignment(assignment=assignment, actor=admin)


def test_assigned_profile_cannot_be_deleted_and_soft_delete_cleans_children(
    common, profile, organization, admin, business_registry
):
    permission = services.save_profile_permission(
        permission=ProfilePermission(profile=profile, contract=profile.contract, permission_code='record:view'),
        actor=admin,
    )
    assignment = services.save_assignment(assignment=grant(common, profile), actor=admin)
    exclusion = services.save_exclusion(
        exclusion=AssignmentExclusion(
            assignment=assignment, contract=common.contract, excluded_organization=organization
        ),
        actor=admin,
    )
    with pytest.raises(ProfileInUse):
        services.delete_profile(profile=profile, actor=admin)
    services.delete_assignment(assignment=assignment, actor=admin)
    assert AssignmentExclusion.all_objects.get(pk=exclusion.pk).deleted_by == admin
    services.delete_profile(profile=profile, actor=admin)
    assert ProfilePermission.all_objects.get(pk=permission.pk).deleted_by == admin
    assert Profile.all_objects.get(pk=profile.pk).deleted_by == admin


def test_assignment_prevents_user_transfer_until_grants_removed(common, profile, other_contract, admin):
    services.save_assignment(assignment=grant(common, profile), actor=admin)
    common.contract = other_contract
    with pytest.raises(ValidationError):
        save_user(user=common)


@pytest.mark.parametrize('actor_kind', ['missing', 'common', 'inactive', 'deleted'])
def test_services_deny_unauthorized_or_unavailable_actor(actor_kind, common, admin):
    actor = admin
    if actor_kind == 'missing':
        actor = None
    elif actor_kind == 'common':
        actor = common
    elif actor_kind == 'inactive':
        admin.is_active = False
        admin.save()
    else:
        admin.delete()
    with pytest.raises(PermissionDenied):
        services.save_profile(profile=Profile(name='Forbidden'), actor=actor)
    assert not Profile.objects.filter(name='Forbidden').exists()


def test_save_cannot_bypass_profile_in_use_with_deleted_at(common, profile, admin):
    services.save_assignment(assignment=grant(common, profile), actor=admin)
    profile.deleted_at = timezone.now()
    with pytest.raises(ValidationError):
        services.save_profile(profile=profile, actor=admin)


@pytest.mark.django_db(transaction=True)
def test_concurrent_profile_creation_does_not_duplicate_name(user_contract, admin):
    barrier = Barrier(2)
    actor_id, contract_id = admin.pk, user_contract.pk

    @system_scope  # Threads não herdam o contexto do teste.
    def create(number):
        close_old_connections()
        try:
            actor = get_user_model().objects.get(pk=actor_id)
            barrier.wait(timeout=10)
            services.save_profile(profile=Profile(name='Concurrent', contract_id=contract_id), actor=actor)
            return 'created'
        except ValidationError:
            return 'blocked'
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(create, (1, 2))) == ['blocked', 'created']


@pytest.mark.parametrize('quantity', [1, 30])
def test_assignment_validation_queries_are_constant_with_many_profile_permissions(
    quantity, common, profile, admin, monkeypatch, django_assert_num_queries
):
    definitions = [PermissionDefinition(f'record:view_{i}', frozenset(PermissionScope)) for i in range(quantity)]
    monkeypatch.setattr(services, 'PERMISSIONS', PermissionRegistry(definitions))
    ProfilePermission.objects.bulk_create(
        [
            ProfilePermission(profile=profile, contract=profile.contract, permission_code=definition.code)
            for definition in definitions
        ]
    )
    with django_assert_num_queries(24):  # +2 da auditoria (snapshot e evento), constantes.
        services.save_assignment(assignment=grant(common, profile), actor=admin)


@pytest.mark.parametrize('change', ['profile', 'inactive'])
def test_last_admin_cannot_be_removed_by_edit(change, common, profile, admin, essential_profile):
    assignment = services.save_assignment(assignment=grant(common, essential_profile), actor=admin)
    if change == 'profile':
        assignment.profile = profile
    else:
        assignment.is_active = False
    with pytest.raises(LastContractAdmin):
        services.save_assignment(assignment=assignment, actor=admin)
    assignment.refresh_from_db()
    assert assignment.profile_id == essential_profile.pk
    assert assignment.is_active


def test_admin_assignment_can_move_to_another_user(common, admin, essential_profile):
    assignment = services.save_assignment(assignment=grant(common, essential_profile), actor=admin)
    assignment.user = get_user_model().objects.create_user(username='replacement', contract=common.contract)
    services.save_assignment(assignment=assignment, actor=admin)
    assignment.refresh_from_db()
    assert assignment.user.username == 'replacement'
