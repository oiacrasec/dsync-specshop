import pytest
from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError, models, transaction
from django.test.utils import isolate_apps
from django.utils import timezone

from apps.core.models import BaseModel


@isolate_apps('apps.core')
def test_automatic_tables_and_many_to_many_names():
    class StockMovement(BaseModel):
        peers = models.ManyToManyField('self')

        class Meta:
            app_label = 'core'

    class HTTPEvent(BaseModel):
        class Meta:
            app_label = 'core'

    class SpecialRecord(BaseModel):
        class Meta:
            app_label = 'core'
            db_table = 'legacy_record'  # Exceção explícita para integração legada.

    assert StockMovement._meta.db_table == 'dsc_stock_movement'
    assert StockMovement.peers.through._meta.db_table == 'dsc_stock_movement_peers'
    assert HTTPEvent._meta.db_table == 'dsc_http_event'
    assert SpecialRecord._meta.db_table == 'legacy_record'


@pytest.mark.django_db
def test_uuid_and_timestamps_are_generated_and_uuid_is_unique():
    user_model = get_user_model()
    first = user_model.objects.create_user(username='first')
    second = user_model.objects.create_user(username='second')
    assert first.public_id.version == second.public_id.version == 7
    assert first.public_id != second.public_id
    assert timezone.is_aware(first.created_at)
    assert timezone.is_aware(first.updated_at)
    with pytest.raises(IntegrityError), transaction.atomic():
        user_model.objects.create(username='duplicate', public_id=first.public_id)


@pytest.mark.django_db
def test_explicit_authorship_survives_partial_save():
    user_model = get_user_model()
    creator = user_model.objects.create_user(username='creator')
    editor = user_model.objects.create_user(username='editor')
    subject = user_model(username='subject')
    subject.save(actor=creator)
    original_uuid = subject.public_id
    created_at = subject.created_at
    updated_at = subject.updated_at
    subject.first_name = 'Nome'
    subject.save(actor=editor, update_fields=['first_name'])
    subject.refresh_from_db()
    assert subject.created_by == creator
    assert subject.updated_by == editor
    assert subject.public_id == original_uuid
    assert subject.created_at == created_at
    assert subject.updated_at > updated_at
    assert subject.first_name == 'Nome'


@pytest.mark.django_db
def test_soft_delete_preserves_data_and_authorship_and_is_idempotent():
    user_model = get_user_model()
    actor = user_model.objects.create_user(username='actor')
    subject = user_model.objects.create_user(username='subject')
    result = subject.delete(actor=actor)
    assert result == (1, {'users.User': 1})
    assert not user_model.objects.filter(pk=subject.pk).exists()
    preserved = user_model.all_objects.get(pk=subject.pk)
    assert preserved.username == 'subject'
    assert preserved.deleted_by == actor
    assert preserved.updated_by == actor
    deleted_at = preserved.deleted_at
    assert preserved.delete() == (0, {'users.User': 0})
    assert preserved.deleted_at == deleted_at
    assert preserved.deleted_by == actor


@pytest.mark.django_db
@pytest.mark.parametrize('quantity', [1, 30])
def test_bulk_delete_uses_one_query_and_keeps_rows(quantity, django_assert_num_queries):
    user_model = get_user_model()
    actor = user_model.objects.create_user(username='actor')
    user_model.objects.bulk_create([user_model(username=f'user-{i}') for i in range(quantity)])
    with django_assert_num_queries(1):
        count, _ = user_model.objects.exclude(pk=actor.pk).delete(actor=actor)
    assert count == quantity
    assert user_model.objects.count() == 1
    assert user_model.all_objects.filter(deleted_by=actor).count() == quantity
    assert user_model.all_objects.filter(deleted_by=actor).delete()[0] == 0


@pytest.mark.django_db
def test_inactive_users_stay_visible_but_cannot_authenticate():
    user = get_user_model().objects.create_user(
        username='inactive', password='test-password', is_active=False
    )
    assert get_user_model().objects.filter(pk=user.pk).exists()
    assert authenticate(username='inactive', password='test-password') is None


@pytest.mark.django_db
def test_deleted_user_cannot_authenticate_or_be_loaded_by_auth_backend():
    from django.contrib.auth.backends import ModelBackend

    user = get_user_model().objects.create_user(username='deleted', password='test-password')
    assert authenticate(username='deleted', password='test-password') == user
    user.delete()
    assert authenticate(username='deleted', password='test-password') is None
    assert ModelBackend().get_user(user.pk) is None


def test_unsaved_instance_cannot_be_deleted():
    with pytest.raises(ValueError, match='unsaved'):
        get_user_model()(username='unsaved').delete()


@pytest.mark.django_db
def test_unsafe_queryset_shapes_cannot_be_deleted():
    user_model = get_user_model()
    user_model.objects.create_user(username='preserved')
    for queryset in (
        user_model.objects.all()[:1],
        user_model.objects.values('username'),
        user_model.objects.distinct('username'),
    ):
        with pytest.raises(TypeError):
            queryset.delete()
    assert user_model.objects.count() == 1


@pytest.mark.django_db
def test_delete_invalidates_queryset_cache_and_preserves_related_authorship():
    user_model = get_user_model()
    creator = user_model.objects.create_user(username='creator')
    subject = user_model(username='subject')
    subject.save(actor=creator)
    queryset = user_model.objects.filter(pk=creator.pk)
    assert list(queryset) == [creator]
    queryset.delete()
    assert list(queryset) == []
    subject.refresh_from_db()
    assert subject.created_by.pk == creator.pk
    assert subject.created_by.deleted_at is not None
    assert user_model.objects.filter(pk=subject.pk).exists()
