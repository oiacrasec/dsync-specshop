from asgiref.sync import sync_to_async
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import transaction

from apps.core.models import SoftDeleteQuerySet


class UserQuerySet(SoftDeleteQuerySet):
    def delete(self, *, actor=None):
        """Exclui um a um via delete_user: o lote não pode pular a proteção do último admin."""
        from .services import delete_user

        if self.query.is_sliced:
            raise TypeError('Cannot delete a sliced queryset.')
        if self.query.distinct_fields or self._fields is not None:
            raise TypeError('Cannot delete a distinct or values queryset.')
        count = 0
        with transaction.atomic(using=self.db):
            for user in self.filter(deleted_at__isnull=True).order_by('pk'):
                count += delete_user(user=user, actor=actor, using=self.db)
        self._result_cache = None
        return count, {self.model._meta.label: count}

    delete.alters_data = True
    delete.queryset_only = True


class UserManager(DjangoUserManager.from_queryset(UserQuerySet)):
    """Mantém create_user/create_superuser e oculta usuários excluídos."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

    def _create_user(self, username, email, password, **extra_fields):
        from .services import save_user

        actor = extra_fields.pop('actor', None)
        user = self._create_user_object(username, email, password, **extra_fields)
        return save_user(user=user, actor=actor, using=self.db)

    async def _acreate_user(self, username, email, password, **extra_fields):
        return await sync_to_async(self._create_user)(username, email, password, **extra_fields)
