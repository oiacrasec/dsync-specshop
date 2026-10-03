from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel
from apps.users.managers import UserManager


class User(AbstractUser, BaseModel):
    """
    Usuário do sistema.

    Modelo customizado desde o início para permitir evolução sem migrações
    complexas. Novos campos pessoais exigem finalidade e base legal
    definidas (skill lgpd).
    """

    objects = UserManager()

    class Meta(BaseModel.Meta):
        abstract = False
        verbose_name = _('usuário')
        verbose_name_plural = _('usuários')
