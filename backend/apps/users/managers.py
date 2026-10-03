from django.contrib.auth.models import UserManager as DjangoUserManager

from apps.core.models import SoftDeleteQuerySet


class UserManager(DjangoUserManager.from_queryset(SoftDeleteQuerySet)):
    """Mantém create_user/create_superuser e oculta usuários excluídos."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)
