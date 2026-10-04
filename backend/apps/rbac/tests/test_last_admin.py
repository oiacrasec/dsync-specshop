from concurrent.futures import ThreadPoolExecutor
from importlib import import_module
from threading import Barrier

import pytest
from django.apps import apps as global_apps
from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection

from apps.core.exceptions import LastContractAdmin
from apps.core.tenancy import system_scope
from apps.rbac import services
from apps.rbac.models import Assignment, Profile
from apps.rbac.selectors import active_admin_count
from apps.users.services import delete_user, save_user

pytestmark = pytest.mark.django_db
migration = import_module('apps.rbac.migrations.0002_essential_contract_admin_profile')


@pytest.fixture
def admin():
    return get_user_model().objects.create_superuser(username='admin')


def make_admin(admin, contract, username, essential_profile):
    user = get_user_model().objects.create_user(username=username, contract=contract)
    assignment = Assignment(contract=contract, user=user, profile=essential_profile, scope='CONTRACT')
    services.save_assignment(assignment=assignment, actor=admin)
    return user, assignment


def test_migration_creates_a_single_essential_system_profile(essential_profile):
    assert essential_profile.contract_id is None
    assert essential_profile.name == 'Administrador do contrato'
    migration.ensure_essential_profile(global_apps, connection.schema_editor())
    assert Profile.all_objects.filter(system_key='contract_admin').count() == 1


def test_migration_restores_a_deleted_or_inactive_essential_profile(essential_profile):
    Profile.all_objects.filter(pk=essential_profile.pk).update(is_active=False)
    essential_profile.delete()
    migration.ensure_essential_profile(global_apps, connection.schema_editor())
    essential_profile.refresh_from_db()
    assert essential_profile.deleted_at is None and essential_profile.is_active


def test_last_admin_assignment_cannot_be_deleted(admin, user_contract, essential_profile):
    _, assignment = make_admin(admin, user_contract, 'ana', essential_profile)
    with pytest.raises(LastContractAdmin):
        services.delete_assignment(assignment=assignment, actor=admin)
    assert active_admin_count(user_contract.pk) == 1


def test_admin_assignment_can_be_deleted_when_another_admin_remains(admin, user_contract, essential_profile):
    _, first = make_admin(admin, user_contract, 'ana', essential_profile)
    make_admin(admin, user_contract, 'bia', essential_profile)
    services.delete_assignment(assignment=first, actor=admin)
    assert active_admin_count(user_contract.pk) == 1


def test_inactive_or_deleted_admin_users_do_not_count(admin, user_contract, essential_profile):
    _, first = make_admin(admin, user_contract, 'ana', essential_profile)
    second, _ = make_admin(admin, user_contract, 'bia', essential_profile)
    get_user_model().objects.filter(pk=second.pk).update(is_active=False)  # Dado já inconsistente.
    with pytest.raises(LastContractAdmin):
        services.delete_assignment(assignment=first, actor=admin)


@pytest.mark.parametrize('action', ['deactivate', 'delete'])
def test_last_admin_user_cannot_be_deactivated_or_deleted(action, admin, user_contract, essential_profile):
    ana, _ = make_admin(admin, user_contract, 'ana', essential_profile)
    with pytest.raises(LastContractAdmin):
        if action == 'deactivate':
            ana.is_active = False
            save_user(user=ana, actor=admin)
        else:
            delete_user(user=ana, actor=admin)
    ana.refresh_from_db()
    assert ana.is_active and ana.deleted_at is None


@pytest.mark.parametrize('action', ['deactivate', 'delete'])
def test_admin_user_can_leave_when_another_admin_remains(action, admin, user_contract, essential_profile):
    ana, _ = make_admin(admin, user_contract, 'ana', essential_profile)
    make_admin(admin, user_contract, 'bia', essential_profile)
    if action == 'deactivate':
        ana.is_active = False
        save_user(user=ana, actor=admin)
    else:
        delete_user(user=ana, actor=admin)
    assert active_admin_count(user_contract.pk) == 1


def test_non_admin_users_are_not_affected(admin, user_contract, essential_profile):
    make_admin(admin, user_contract, 'ana', essential_profile)
    common = get_user_model().objects.create_user(username='comum', contract=user_contract)
    delete_user(user=common, actor=admin)
    common.refresh_from_db()
    assert common.deleted_at is not None and common.deleted_by == admin


def test_contract_without_admin_is_allowed_until_the_first_is_named(user_contract):
    assert active_admin_count(user_contract.pk) == 0
    get_user_model().objects.create_user(username='comum', contract=user_contract)


@pytest.fixture
def essential_profile_tx(transactional_db):
    """Testes transacionais esvaziam o banco; a função idempotente da migration recria o perfil."""
    migration.ensure_essential_profile(global_apps, connection.schema_editor())
    return Profile.objects.get(system_key='contract_admin', contract__isnull=True)


@pytest.mark.django_db(transaction=True)
def test_concurrent_removal_of_the_two_last_admins_keeps_one(admin, user_contract, essential_profile_tx):
    essential_profile = essential_profile_tx
    _, first = make_admin(admin, user_contract, 'ana', essential_profile)
    bia, _ = make_admin(admin, user_contract, 'bia', essential_profile)
    barrier = Barrier(2)

    @system_scope  # Threads não herdam o contexto do teste.
    def remove_assignment():
        close_old_connections()
        barrier.wait()
        try:
            services.delete_assignment(assignment=Assignment.objects.get(pk=first.pk), actor=admin)
            return 'ok'
        except LastContractAdmin:
            return 'blocked'
        finally:
            close_old_connections()

    @system_scope  # Threads não herdam o contexto do teste.
    def remove_user():
        close_old_connections()
        barrier.wait()
        try:
            delete_user(user=get_user_model().objects.get(pk=bia.pk), actor=admin)
            return 'ok'
        except LastContractAdmin:
            return 'blocked'
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = sorted(
            future.result() for future in (executor.submit(remove_assignment), executor.submit(remove_user))
        )
    assert results == ['blocked', 'ok']
    assert active_admin_count(user_contract.pk) == 1


def test_model_delete_also_protects_the_last_admin(admin, user_contract, essential_profile):
    ana, _ = make_admin(admin, user_contract, 'ana', essential_profile)
    with pytest.raises(LastContractAdmin):
        ana.delete(actor=admin)
    ana.refresh_from_db()
    assert ana.deleted_at is None


@pytest.mark.parametrize('manager', ['objects', 'all_objects'])
def test_bulk_delete_cannot_remove_all_admins_and_rolls_back(manager, admin, user_contract, essential_profile):
    make_admin(admin, user_contract, 'ana', essential_profile)
    make_admin(admin, user_contract, 'bia', essential_profile)
    with pytest.raises(LastContractAdmin):
        getattr(get_user_model(), manager).filter(contract=user_contract).delete(actor=admin)
    assert active_admin_count(user_contract.pk) == 2  # Nenhum excluído: tudo ou nada.


def test_bulk_delete_of_common_users_keeps_authorship(admin, user_contract, essential_profile):
    make_admin(admin, user_contract, 'ana', essential_profile)
    for name in ('c1', 'c2'):
        get_user_model().objects.create_user(username=name, contract=user_contract)
    count, _ = get_user_model().objects.filter(username__in=['c1', 'c2']).delete(actor=admin)
    assert count == 2
    assert set(get_user_model().all_objects.filter(username__in=['c1', 'c2']).values_list('deleted_by', flat=True)) == {
        admin.pk
    }


def test_model_save_also_protects_the_last_admin(admin, user_contract, essential_profile):
    ana, _ = make_admin(admin, user_contract, 'ana', essential_profile)
    ana.is_active = False
    with pytest.raises(LastContractAdmin):
        ana.save(actor=admin)
    ana.refresh_from_db()
    assert ana.is_active


def test_model_save_with_rule_field_in_update_fields_is_checked(admin, user_contract, essential_profile):
    ana, _ = make_admin(admin, user_contract, 'ana', essential_profile)
    ana.is_active = False
    with pytest.raises(LastContractAdmin):
        ana.save(update_fields=['is_active'])


def test_save_without_rule_fields_skips_locks(admin, user_contract, essential_profile, django_assert_num_queries):
    ana, _ = make_admin(admin, user_contract, 'ana', essential_profile)
    ana.first_name = 'Ana'
    with django_assert_num_queries(1):
        ana.save(update_fields=['first_name'])
    ana.refresh_from_db()
    assert ana.first_name == 'Ana'


def test_save_rejects_positional_arguments(admin):
    with pytest.raises(TypeError):
        admin.save(False)
