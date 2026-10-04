from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.managers import ScopedManagerMixin, SoftDeleteQuerySet
from apps.core.models import HybridScopedModel


class AuditEventType(models.TextChoices):
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


class AppendOnlyQuerySet(SoftDeleteQuerySet):
    """Trilha imutável: nem soft delete nem update em lote (ADR 0017)."""

    def delete(self, *, actor=None):
        raise TypeError('Eventos de auditoria não podem ser excluídos.')

    def update(self, **kwargs):
        raise TypeError('Eventos de auditoria não podem ser alterados.')

    delete.queryset_only = True
    update.queryset_only = True


class AuditManager(ScopedManagerMixin, models.Manager.from_queryset(AppendOnlyQuerySet)):
    pass


class AllAuditManager(AuditManager):
    include_deleted = True


class AuditEvent(HybridScopedModel):
    """Evento de auditoria append-only: quem (created_by), quando (created_at) e o quê.

    Exemplo: superadmin cria a atribuição Leitor para a Maria → event='assignment.created',
    target_type='rbac.assignment', changes={'before': None, 'after': {...}}. Contract nulo
    indica evento do sistema (perfil do sistema, contas de superadmin). Só ids públicos no
    JSON, sem outros dados pessoais (skill lgpd).
    """

    event = models.CharField(_('evento'), max_length=64, choices=AuditEventType.choices)
    context_organization = models.ForeignKey('contracts.Organization', verbose_name=_('organização do contexto'),
                                             on_delete=models.PROTECT, null=True, blank=True, related_name='+',)
    target_type = models.CharField(_('tipo do alvo'), max_length=64, blank=True, default='')
    target_public_id = models.UUIDField(_('identificador público do alvo'), null=True, blank=True)
    access_jti = models.CharField(_('jti do token de acesso'), max_length=255, blank=True, default='')
    changes = models.JSONField(_('alterações'), default=dict, blank=True)

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
