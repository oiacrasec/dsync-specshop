from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import DscModelBase, HybridScopedModel

from .constants import ACCESS_LOG_MINIMUM_RETENTION_MONTHS
from .managers import AccessLogManager, AccessLogQuerySet, AllAuditManager, AppendOnlyQuerySet, AuditManager


class AuditEventType(models.TextChoices):
    PLAN_CREATED = 'plan.created', _('plano criado')
    PLAN_UPDATED = 'plan.updated', _('plano alterado')
    PLAN_DELETED = 'plan.deleted', _('plano excluído')
    CONTRACT_CREATED = 'contract.created', _('contrato criado')
    CONTRACT_UPDATED = 'contract.updated', _('contrato alterado')
    CONTRACT_DELETED = 'contract.deleted', _('contrato excluído')
    PROFILE_CREATED = 'profile.created', _('perfil criado')
    PROFILE_UPDATED = 'profile.updated', _('perfil alterado')
    PROFILE_DELETED = 'profile.deleted', _('perfil excluído')
    PROFILE_PERMISSION_ADDED = 'profile_permission.added', _('permissão adicionada ao perfil')
    PROFILE_PERMISSION_UPDATED = 'profile_permission.updated', _('permissão do perfil alterada')
    PROFILE_PERMISSION_REMOVED = 'profile_permission.removed', _('permissão removida do perfil')
    ASSIGNMENT_CREATED = 'assignment.created', _('atribuição criada')
    ASSIGNMENT_UPDATED = 'assignment.updated', _('atribuição alterada')
    ASSIGNMENT_DELETED = 'assignment.deleted', _('atribuição excluída')
    EXCLUSION_ADDED = 'exclusion.added', _('exceção adicionada')
    EXCLUSION_UPDATED = 'exclusion.updated', _('exceção alterada')
    EXCLUSION_REMOVED = 'exclusion.removed', _('exceção removida')
    SUPERADMIN_CREATED = 'superadmin.created', _('superadmin criado')
    SUPERADMIN_PROMOTED = 'superadmin.promoted', _('usuário promovido a superadmin')
    SUPERADMIN_DEMOTED = 'superadmin.demoted', _('superadmin rebaixado')
    SUPERADMIN_DEACTIVATED = 'superadmin.deactivated', _('superadmin desativado')
    SUPERADMIN_REACTIVATED = 'superadmin.reactivated', _('superadmin reativado')
    SUPERADMIN_DELETED = 'superadmin.deleted', _('superadmin excluído')
    SUPERADMIN_RESTORED = 'superadmin.restored', _('superadmin restaurado')
    SUPERADMIN_ENTERED_ORGANIZATION = 'superadmin.entered_organization', _('superadmin entrou em organização')


class AuditEvent(HybridScopedModel):
    """Evento de auditoria append-only: quem (created_by), quando (created_at) e o quê.

    Exemplo: superadmin cria a atribuição Leitor para a Maria → event='assignment.created',
    target_type='rbac.assignment', changes={'before': None, 'after': {...}}. Contract nulo
    indica evento do sistema (perfil do sistema, contas de superadmin). Só ids públicos no
    JSON, sem outros dados pessoais (skill lgpd).
    """

    event = models.CharField(verbose_name=_('evento'), max_length=64, choices=AuditEventType.choices)
    context_organization = models.ForeignKey('contracts.Organization', verbose_name=_('organização do contexto'),
                                             on_delete=models.PROTECT, null=True, blank=True, related_name='+',)
    target_type = models.CharField(verbose_name=_('tipo do alvo'), max_length=64, blank=True, default='')
    target_public_id = models.UUIDField(verbose_name=_('identificador público do alvo'), null=True, blank=True)
    access_jti = models.CharField(verbose_name=_('jti do token de acesso'), max_length=255, blank=True, default='')
    changes = models.JSONField(verbose_name=_('alterações'), default=dict, blank=True)

    objects = AuditManager()
    all_objects = AllAuditManager()
    _base_objects = models.Manager.from_queryset(AppendOnlyQuerySet)()  # Base também imutável.

    class Meta(HybridScopedModel.Meta):
        abstract = False
        verbose_name = _('evento de auditoria')
        verbose_name_plural = _('eventos de auditoria')
        indexes = [
            models.Index(fields=['contract', 'created_at'], name='dsc_audit_contract_created'),
            models.Index(fields=['target_type', 'target_public_id'], name='dsc_audit_target'),
            models.Index(fields=['created_by', 'created_at'], name='dsc_audit_actor_created'),
        ]
        constraints = [
            # Entrada do superadmin: no máximo 1 por superadmin + organização + access token.
            models.UniqueConstraint(fields=['created_by', 'context_organization', 'access_jti'],
                                    condition=models.Q(event='superadmin.entered_organization') &
                                    ~models.Q(access_jti=''), name='dsc_audit_superadmin_entry_unique'),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise TypeError('Eventos de auditoria não podem ser alterados.')
        return super().save(*args, **kwargs)

    save.alters_data = True

    def delete(self, *args, **kwargs):
        raise TypeError('Eventos de auditoria não podem ser excluídos.')

    delete.alters_data = True


class AccessLogAction(models.TextChoices):
    LOGIN_SUCCESS = 'LOGIN_SUCCESS', _('login com sucesso')
    LOGIN_FAILURE = 'LOGIN_FAILURE', _('login com falha')
    REFRESH_SUCCESS = 'REFRESH_SUCCESS', _('renovação de token com sucesso')


class AccessLog(models.Model, metaclass=DscModelBase):
    """Registro de acesso a aplicação (Marco Civil art. 15; ADR 0006 §6, ADR 0018).

    Exemplo: Maria faz login ou renova o token → um registro com action e origem.
    Consultas comuns não geram linha (ADR 0019). Sem BaseModel: só
    inserção, sem soft delete nem autoria. Guarda mínima de 6 meses; o expurgo e o
    LegalHold vêm na entrega do ADR 0007. Sob sigilo: leitura só global explícita.
    """

    minimum_retention_months = ACCESS_LOG_MINIMUM_RETENTION_MONTHS

    id = models.BigAutoField(primary_key=True)
    occurred_at = models.DateTimeField(verbose_name=_('data e hora (UTC)'), default=timezone.now)
    # Registros anteriores ao ADR 0019 ficam sem classificação; não inferir seu evento.
    action = models.CharField(verbose_name=_('ação'), max_length=32, choices=AccessLogAction.choices, blank=True,
                              default='')
    ip = models.GenericIPAddressField(verbose_name=_('IP de origem'))
    port = models.PositiveIntegerField(verbose_name=_('porta de origem'), null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('usuário'), on_delete=models.PROTECT,
                             null=True, blank=True, related_name='+',)
    contract = models.ForeignKey('contracts.Contract', verbose_name=_('contrato'), on_delete=models.PROTECT,
                                 null=True, blank=True, related_name='+',)
    organization = models.ForeignKey('contracts.Organization', verbose_name=_('organização'),
                                     on_delete=models.PROTECT, null=True, blank=True, related_name='+',)
    request_id = models.UUIDField(verbose_name=_('identificador da requisição'), null=True, blank=True)

    objects = AccessLogManager()
    _base_objects = models.Manager.from_queryset(AccessLogQuerySet)()

    class Meta:
        verbose_name = _('registro de acesso')
        verbose_name_plural = _('registros de acesso')
        base_manager_name = '_base_objects'
        indexes = [
            # Ordem judicial pede usuário ou IP + período (art. 22); o expurgo usa a data.
            models.Index(fields=['occurred_at'], name='dsc_access_log_occurred'),
            models.Index(fields=['user', 'occurred_at'], name='dsc_access_log_user'),
            models.Index(fields=['ip', 'occurred_at'], name='dsc_access_log_ip'),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(port__isnull=True) | models.Q(port__lte=65535),
                                   name='dsc_access_log_valid_port'),
        ]

    def __str__(self):
        return f'acesso {self.pk} em {self.occurred_at:%Y-%m-%d %H:%M:%S}'  # Sem IP: dado pessoal (LGPD).

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise TypeError('Registros de acesso não podem ser alterados.')
        return super().save(*args, **kwargs)

    save.alters_data = True

    def delete(self, *args, **kwargs):
        raise TypeError('Registros de acesso não podem ser excluídos fora do expurgo.')

    delete.alters_data = True
