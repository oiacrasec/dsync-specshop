from django.db import models
from django.db.models.functions import Lower
from django.utils.translation import gettext_lazy as _

from apps.core.models import ContractScopedModel


class TrackedProduct(ContractScopedModel):
    """Produto acompanhado pelo cliente (RF-01, D-24), compartilhado no contrato (ADR 2003 §1).

    Nome e modelo direcionam a pesquisa; marca e EAN são opcionais. O SPECSHOP só compara
    produtos novos (D-21), por isso não há campo de condição. Arquivar é a exclusão lógica
    do core: o histórico de preços continua (ADR 2003 §2).
    """

    name = models.CharField(verbose_name=_('nome'), max_length=255)
    model = models.CharField(verbose_name=_('modelo'), max_length=120)
    brand = models.CharField(verbose_name=_('marca'), max_length=120, blank=True)
    ean = models.CharField(verbose_name=_('EAN'), max_length=13, blank=True)

    class Meta(ContractScopedModel.Meta):
        abstract = False
        verbose_name = _('produto acompanhado')
        verbose_name_plural = _('produtos acompanhados')
        constraints = [
            # Bloqueia o mesmo produto duas vezes no contrato; arquivados não contam.
            models.UniqueConstraint(Lower('name'), Lower('model'), 'contract',
                                    condition=models.Q(deleted_at__isnull=True),
                                    name='catalog_product_unique_name_model'),
        ]
        indexes = [
            # Listagem padrão: produtos não arquivados do contrato, ordenados pelo nome.
            models.Index(fields=['contract', 'name'], condition=models.Q(deleted_at__isnull=True),
                         name='catalog_product_contract_name'),
        ]

    def __str__(self):
        return f'{self.name} · {self.model}'
