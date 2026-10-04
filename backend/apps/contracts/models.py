from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, ContractScopedModel, SharedModel


class Plan(SharedModel):
    """Oferta comercial com limites opcionais, sem escolher a implantação.

    Exemplo: plano com até 10 filiais e 20 GB de arquivos. Campos nulos indicam
    limite não definido. Esta tabela guarda a configuração; consumo e bloqueios
    serão implementados junto das funcionalidades correspondentes.
    """

    name = models.CharField(_('nome'), max_length=255)
    max_organizations = models.PositiveIntegerField(_('limite de organizações'), null=True, blank=True)
    max_storage_bytes = models.PositiveBigIntegerField(_('limite de armazenamento em bytes'), null=True, blank=True)
    max_integrations = models.PositiveIntegerField(_('limite de integrações'), null=True, blank=True)
    max_operations_per_month = models.PositiveBigIntegerField(_('limite de operações por mês'), null=True, blank=True)

    class Meta(SharedModel.Meta):
        abstract = False
        verbose_name = _('plano')
        verbose_name_plural = _('planos')

    def __str__(self):
        return self.name


class Contract(BaseModel):
    """Raiz do cliente: uma empresa ou prefeitura com plano e licenças contratadas.

    Não pertence a outro contrato. Suas organizações representam filiais ou
    secretarias; a visibilidade da raiz seguirá as regras do ADR 0012.
    """

    name = models.CharField(_('nome'), max_length=255)
    plan = models.ForeignKey('Plan', verbose_name=_('plano'), on_delete=models.PROTECT, related_name='+',)
    start_date = models.DateField(_('início da vigência'))
    end_date = models.DateField(_('fim da vigência'), null=True, blank=True)
    licenses = models.PositiveIntegerField(_('licenças'), validators=[MinValueValidator(1)])
    post_termination_retention_days = models.PositiveSmallIntegerField(_('dias de retenção após encerramento'),
                                                                      default=90, validators=[MaxValueValidator(365)])

    class Meta(BaseModel.Meta):
        abstract = False
        verbose_name = _('contrato')
        verbose_name_plural = _('contratos')
        constraints = [
            models.CheckConstraint(condition=models.Q(end_date__isnull=True) |
                                   models.Q(end_date__gte=models.F('start_date')), name='dsc_contract_valid_dates'),
            models.CheckConstraint(condition=models.Q(licenses__gte=1), name='dsc_contract_positive_licenses'),
            models.CheckConstraint(condition=models.Q(post_termination_retention_days__lte=365),
                                   name='dsc_contract_retention_max_365'),
        ]

    def __str__(self):
        return self.name

    def is_available(self, today=None):
        """Ativo e dentro da vigência (início e fim inclusivos); ADR 0006 §2.1."""
        today = today or timezone.localdate()
        return (self.is_active and self.deleted_at is None and self.start_date <= today
                and (self.end_date is None or self.end_date >= today))


class Organization(ContractScopedModel):
    """Unidade de um cliente: uma filial da empresa ou secretaria da prefeitura.

    Contract é obrigatório e herdado. Nome e situação descrevem a unidade;
    permissões de acesso serão aplicadas pelo contexto e pelas atribuições.
    """

    name = models.CharField(_('nome'), max_length=255)

    class Meta(ContractScopedModel.Meta):
        abstract = False
        verbose_name = _('organização')
        verbose_name_plural = _('organizações')

    def __str__(self):
        return self.name
