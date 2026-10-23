from uuid import uuid7

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.media import MB, MediaImageField
from apps.core.models import BaseModel, DscModelBase
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
    # Só aparência da interface (finalidade: personalização; sem dado pessoal sensível).
    preferences = models.JSONField(verbose_name=_('preferências'), default=dict, blank=True)
    # Foto opcional (finalidade: identificação visual na interface; sai na exclusão do usuário).
    avatar = MediaImageField(verbose_name=_('foto'), folder='avatars', max_size=2 * MB, square=256)
    # Fuso para exibir datas; vazio = TIME_ZONE do sistema. O banco segue em UTC.
    time_zone = models.CharField(verbose_name=_('fuso horário'), max_length=64, blank=True, default='')

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


class UserSession(models.Model, metaclass=DscModelBase):
    """Uma sessão por login (9.3): a cadeia de refresh rotacionados de um dispositivo.

    Registro técnico de autenticação, sem escopo nem soft delete (`UNSCOPED_RECORDS`): apagado ao
    encerrar, sair ou expirar (LGPD, minimização). Guarda só o rótulo do dispositivo, não o
    User-Agent inteiro; o histórico com IP fica no registro de acesso (Marco Civil).
    """

    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(verbose_name=_('identificador público'), default=uuid7, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('usuário'), on_delete=models.CASCADE,
                             related_name='sessions')
    refresh_jti = models.CharField(verbose_name=_('refresh atual'), max_length=255, unique=True)
    device = models.CharField(verbose_name=_('dispositivo'), max_length=80)
    ip = models.GenericIPAddressField(verbose_name=_('IP do último uso'))
    created_at = models.DateTimeField(verbose_name=_('início'), auto_now_add=True)
    last_seen_at = models.DateTimeField(verbose_name=_('último uso'))
    expires_at = models.DateTimeField(verbose_name=_('expira em'))

    class Meta:
        verbose_name = _('sessão')
        verbose_name_plural = _('sessões')
        indexes = [models.Index(fields=['user', 'expires_at'])]

    def __str__(self):
        return f'{self.device} ({self.public_id})'
