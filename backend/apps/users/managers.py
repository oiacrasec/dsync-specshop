from asgiref.sync import sync_to_async
from django.contrib.auth.models import UserManager as DjangoUserManager

from apps.core.models import SoftDeleteQuerySet


class UserManager(DjangoUserManager.from_queryset(SoftDeleteQuerySet)):
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
