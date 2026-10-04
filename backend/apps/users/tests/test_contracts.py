from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections, transaction
from django.utils import timezone

from apps.contracts.models import Contract
from apps.core.exceptions import ContractInactive, LicenseLimitReached
from apps.users.services import save_user


@pytest.mark.django_db
def test_common_user_requires_contract_and_superadmin_requires_no_contract(user_contract):
    manager = get_user_model().objects
    with pytest.raises(ValidationError):
        manager.create_user(username='missing-contract')
    with pytest.raises(ValidationError):
        manager.create_superuser(username='invalid-admin', contract=user_contract)
    with pytest.raises(ValidationError):  # create() também passa por User.save → save_user.
        manager.create(username='direct-invalid')
    model = get_user_model()
    with pytest.raises(IntegrityError), transaction.atomic():  # A constraint segura o que pula o service.
        manager.bulk_create([model(username='direct-invalid')])
    with pytest.raises(IntegrityError), transaction.atomic():
        manager.bulk_create([model(username='direct-invalid-admin', is_superuser=True, contract=user_contract)])
    admin = manager.create_superuser(username='valid-admin')
    assert admin.contract_id is None


@pytest.mark.django_db
def test_inactive_users_consume_licenses_and_deactivation_does_not_release(user_contract):
    user_contract.licenses = 1
    user_contract.save()
    user = get_user_model().objects.create_user(username='occupant', contract=user_contract)
    user.is_active = False
    save_user(user=user)
    with pytest.raises(LicenseLimitReached):
        get_user_model().objects.create_user(username='extra', is_active=False, contract=user_contract)
    assert get_user_model().objects.filter(contract=user_contract).count() == 1


@pytest.mark.django_db
def test_soft_delete_releases_license_and_restore_requires_capacity(user_contract):
    user_contract.licenses = 1
    user_contract.save()
    user = get_user_model().objects.create_user(username='original', contract=user_contract)
    user.delete()
    replacement = get_user_model().objects.create_user(username='replacement', contract=user_contract)
    user.deleted_at = None
    with pytest.raises(LicenseLimitReached):
        save_user(user=user)
    user.refresh_from_db()
    assert user.deleted_at is not None
    replacement.delete()
    user.deleted_at = None
    save_user(user=user)
    assert get_user_model().objects.get(pk=user.pk) == user


@pytest.mark.django_db
def test_edit_existing_user_at_capacity_does_not_consume_another_license(user_contract):
    user_contract.licenses = 1
    user_contract.save()
    user = get_user_model().objects.create_user(username='occupant', contract=user_contract)
    user.first_name = 'Novo nome'
    save_user(user=user)
    user.refresh_from_db()
    assert user.first_name == 'Novo nome'


@pytest.mark.django_db
def test_transfer_requires_capacity_in_target_and_does_not_modify_source_on_failure(user_contract):
    manager = get_user_model().objects
    user = manager.create_user(username='moving', contract=user_contract)
    target = Contract.objects.create(
        name='Outro cliente', plan=user_contract.plan, start_date=user_contract.start_date, licenses=1
    )
    occupant = manager.create_user(username='target-occupant', contract=target)
    user.contract = target
    with pytest.raises(LicenseLimitReached):
        save_user(user=user)
    user.refresh_from_db()
    assert user.contract_id == user_contract.pk
    occupant.delete()
    user.contract = target
    save_user(user=user)
    assert manager.filter(contract=user_contract).count() == 0
    assert manager.filter(contract=target).count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize('state', ['inactive', 'deleted', 'expired', 'future'])
def test_unavailable_contract_rejects_user_creation(user_contract, state):
    if state == 'inactive':
        user_contract.is_active = False
    elif state == 'deleted':
        user_contract.deleted_at = timezone.now()
    elif state == 'expired':
        user_contract.end_date = timezone.localdate() - timedelta(days=1)
    else:
        user_contract.start_date = timezone.localdate() + timedelta(days=1)
    user_contract.save()
    expected = ValidationError if state == 'deleted' else ContractInactive
    with pytest.raises(expected):
        get_user_model().objects.create_user(username='blocked', contract=user_contract)
    assert not get_user_model().objects.filter(username='blocked').exists()


@pytest.mark.django_db
def test_contract_valid_on_end_date_and_explicit_authorship(user_contract):
    actor = get_user_model().objects.create_superuser(username='actor')
    user_contract.end_date = timezone.localdate()
    user_contract.save()
    user = get_user_model().objects.create_user(username='created', contract=user_contract, actor=actor)
    assert user.created_by == actor
    assert user.updated_by == actor


@pytest.mark.django_db(transaction=True)
def test_async_creation_uses_same_license_policy(user_contract):
    user_contract.licenses = 1
    user_contract.save()
    manager = get_user_model().objects
    user = async_to_sync(manager.acreate_user)(username='async', contract=user_contract)
    assert user.contract_id == user_contract.pk
    with pytest.raises(LicenseLimitReached):
        async_to_sync(manager.acreate_user)(username='async-blocked', contract=user_contract)


@pytest.mark.django_db(transaction=True)
def test_concurrent_creation_cannot_exceed_contract_capacity(user_contract):
    user_contract.licenses = 1
    user_contract.save()
    barrier = Barrier(2)
    contract_id = user_contract.pk

    def create(number):
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            get_user_model().objects.create_user(username=f'concurrent-{number}', contract_id=contract_id)
            return 'created'
        except LicenseLimitReached:
            return 'blocked'
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(create, (1, 2))) == ['blocked', 'created']
    assert get_user_model().objects.filter(contract_id=contract_id).count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize('quantity', [1, 30])
def test_license_check_queries_do_not_grow_with_user_count(user_contract, quantity, django_assert_num_queries):
    model = get_user_model()
    model.objects.bulk_create([model(username=f'existing-{i}', contract=user_contract) for i in range(quantity)])
    with django_assert_num_queries(5):
        model.objects.create_user(username='new', contract=user_contract)


@pytest.mark.django_db
def test_model_save_also_enforces_license_limit(user_contract):
    user_contract.licenses = 1
    user_contract.save()
    model = get_user_model()
    model.objects.create_user(username='occupant', contract=user_contract)
    with pytest.raises(LicenseLimitReached):
        model(username='extra', contract=user_contract).save()
