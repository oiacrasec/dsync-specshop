from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import ContractScopedModel, HybridScopedModel
from apps.core.permission_registry import PermissionScope

from .constants import ESSENTIAL_PROFILE_KEY


class Profile(HybridScopedModel):
    """Perfil vinculado: Leitor do sistema ou Operador de um cliente.

    Contract nulo indica perfil do sistema. O perfil essencial Administrador do
    contrato usa system_key=ESSENTIAL_PROFILE_KEY e é criado pela migration rbac.0002.
    """

    name = models.CharField(_('nome'), max_length=255)
    system_key = models.CharField(_('chave de sistema'), max_length=64, blank=True, default='', editable=False)

    class Meta(HybridScopedModel.Meta):
        abstract = False
        verbose_name = _('perfil')
        verbose_name_plural = _('perfis')
        constraints = [
            models.UniqueConstraint(fields=['contract', 'name'], condition=models.Q(deleted_at__isnull=True),
                                    nulls_distinct=False, name='dsc_profile_name_unique'),
            models.UniqueConstraint(fields=['system_key'], condition=~models.Q(system_key=''),
                                    name='dsc_profile_system_key_unique'),
            models.CheckConstraint(condition=models.Q(system_key='') |
                                   models.Q(system_key=ESSENTIAL_PROFILE_KEY, contract__isnull=True),
                                   name='dsc_profile_system_key_valid'),
        ]

    def __str__(self):
        return self.name


class ProfilePermission(HybridScopedModel):
    """Código do registry ligado ao perfil, com o mesmo contexto do perfil.

    Exemplo: uma permissão de leitura do domínio dentro do perfil Leitor.
    Não é uma linha de auth_permission; alterar esta relação afeta os usuários vinculados.
    """

    profile = models.ForeignKey(Profile, verbose_name=_('perfil'), on_delete=models.PROTECT,
                                related_name='permissions',)
    permission_code = models.CharField(_('permissão'), max_length=128)

    class Meta(HybridScopedModel.Meta):
        abstract = False
        verbose_name = _('permissão do perfil')
        verbose_name_plural = _('permissões do perfil')
        constraints = [
            models.UniqueConstraint(fields=['profile', 'permission_code'], condition=models.Q(deleted_at__isnull=True),
                                    name='dsc_profile_permission_unique'),
        ]


class Assignment(ContractScopedModel):
    """Concessão a um usuário: perfil ou permissão avulsa, nunca ambos.

    Exemplo: Leitor no contrato inteiro, ou uma permissão adicional só na Matriz.
    scope_organization é o destino da concessão; o registro pertence ao contrato.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('usuário'), on_delete=models.PROTECT,
                             related_name='access_assignments',)
    profile = models.ForeignKey(Profile, verbose_name=_('perfil'), on_delete=models.PROTECT,
                                null=True, blank=True, related_name='assignments',)
    permission_code = models.CharField(_('permissão avulsa'), max_length=128, blank=True, default='')
    scope = models.CharField(_('escopo'), max_length=12,
                             choices=[(scope.value, scope.value) for scope in PermissionScope])
    scope_organization = models.ForeignKey('contracts.Organization', verbose_name=_('organização do escopo'),
                                           on_delete=models.PROTECT, null=True, blank=True, related_name='+',)

    class Meta(ContractScopedModel.Meta):
        abstract = False
        verbose_name = _('atribuição')
        verbose_name_plural = _('atribuições')
        indexes = [models.Index(fields=['contract', 'user'])]
        constraints = [
            models.CheckConstraint(condition=models.Q(profile__isnull=False, permission_code='') |
                                   (models.Q(profile__isnull=True) & ~models.Q(permission_code='')),
                                   name='dsc_assignment_one_grant'),
            models.CheckConstraint(condition=models.Q(scope='CONTRACT', scope_organization__isnull=True) |
                                   models.Q(scope='ORGANIZATION', scope_organization__isnull=False),
                                   name='dsc_assignment_scope_valid'),
            models.UniqueConstraint(fields=['contract', 'user', 'scope', 'scope_organization', 'profile',
                                            'permission_code'], condition=models.Q(deleted_at__isnull=True),
                                    nulls_distinct=False, name='dsc_assignment_unique'),
        ]


class AssignmentExclusion(ContractScopedModel):
    """Organização que uma atribuição no contrato não alcança.

    Exemplo: Leitor no contrato inteiro, exceto a filial Matriz. A exceção só
    restringe esta atribuição; outra atribuição pode conceder acesso à Matriz.
    """

    assignment = models.ForeignKey(Assignment, verbose_name=_('atribuição'), on_delete=models.PROTECT,
                                   related_name='exclusions',)
    excluded_organization = models.ForeignKey('contracts.Organization', verbose_name=_('organização excluída'),
                                              on_delete=models.PROTECT, related_name='+',)

    class Meta(ContractScopedModel.Meta):
        abstract = False
        verbose_name = _('exceção de organização')
        verbose_name_plural = _('exceções de organização')
        constraints = [
            models.UniqueConstraint(fields=['assignment', 'excluded_organization'],
                                    condition=models.Q(deleted_at__isnull=True),
                                    name='dsc_assignment_exclusion_unique'),
        ]
