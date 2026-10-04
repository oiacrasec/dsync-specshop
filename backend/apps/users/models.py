from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel
from apps.users.managers import AllUsersManager, UserManager


class User(AbstractUser, BaseModel):
    """
    Usuário do sistema.

    Modelo customizado desde o início para permitir evolução sem migrações
    complexas. Novos campos pessoais exigem finalidade e base legal
    definidas (skill lgpd).
    """

    objects = UserManager()
    all_objects = AllUsersManager()

    contract = models.ForeignKey('contracts.Contract', verbose_name=_('contrato'), on_delete=models.PROTECT,
                                 null=True, blank=True, related_name='+',)
    must_change_password = models.BooleanField(verbose_name=_('deve trocar a senha'), default=False)

    class Meta(BaseModel.Meta):
        abstract = False
        verbose_name = _('usuário')
        verbose_name_plural = _('usuários')
        constraints = [
            models.CheckConstraint(condition=models.Q(is_superuser=True, contract__isnull=True) |
                                   models.Q(is_superuser=False, contract__isnull=False),
                                   name='dsc_user_contract_by_role'),
        ]

    def save(self, *args, actor=None, using=None, **kwargs):
        """Delega a save_user: papel, contrato, licenças e último administrador."""
        from apps.users.services import save_user

        if args:
            raise TypeError('Use argumentos nomeados em User.save().')
        save_user(user=self, actor=actor, using=using, **kwargs)

    save.alters_data = True

    def delete(self, using=None, keep_parents=False, *, actor=None):
        """Delega a delete_user: nunca deixa o contrato sem administrador (ADR 0009 §5)."""
        from apps.users.services import delete_user

        count = delete_user(user=self, actor=actor, using=using)
        return count, {self._meta.label: count}

    delete.alters_data = True
