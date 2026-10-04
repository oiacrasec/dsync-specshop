import re
from uuid import uuid7

from django.conf import settings
from django.db import models, router
from django.db.models.base import ModelBase
from django.utils.translation import gettext_lazy as _

from .managers import AllObjectsManager, SoftDeleteManager, SoftDeleteQuerySet


class DscModelBase(ModelBase):
    """Define a tabela antes de o Django preparar relações N:N automáticas."""

    def __new__(cls, name, bases, attrs, **kwargs):
        meta = attrs.get('Meta')
        if not getattr(meta, 'abstract', False) and not getattr(meta, 'proxy', False):
            if meta is None:
                meta = type('Meta', (), {})
                attrs['Meta'] = meta
            if not getattr(meta, 'db_table', None):
                table = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name)
                table = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', table).lower()
                meta.db_table = f'dsc_{table}'
        return super().__new__(cls, name, bases, attrs, **kwargs)


class BaseModel(models.Model, metaclass=DscModelBase):
    """Persistência comum; autoria é explícita, não inferida da requisição."""

    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(verbose_name=_('identificador público'), default=uuid7, unique=True, editable=False)
    created_at = models.DateTimeField(verbose_name=_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(verbose_name=_('atualizado em'), auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('criado por'),
                                   on_delete=models.SET_NULL, null=True, blank=True, editable=False, related_name='+',)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('atualizado por'),
                                   on_delete=models.SET_NULL, null=True, blank=True, editable=False, related_name='+',)
    is_active = models.BooleanField(verbose_name=_('ativo'), default=True)
    deleted_at = models.DateTimeField(verbose_name=_('excluído em'), null=True, blank=True, editable=False)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('excluído por'),
                                   on_delete=models.SET_NULL, null=True, blank=True, editable=False, related_name='+',)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()
    # Sem filtro: só o Django usa (seguir FKs, refresh_from_db). Não usar em código de domínio.
    _base_objects = models.Manager.from_queryset(SoftDeleteQuerySet)()

    class Meta:
        abstract = True
        default_manager_name = 'objects'
        base_manager_name = '_base_objects'

    def save(self, *args, actor=None, **kwargs):
        if actor is not None:
            if self._state.adding:
                self.created_by = actor
            self.updated_by = actor
            if kwargs.get('update_fields'):
                kwargs['update_fields'] = set(kwargs['update_fields']) | {'updated_by', 'updated_at'}
        return super().save(*args, **kwargs)

    save.alters_data = True

    def delete(self, using=None, keep_parents=False, *, actor=None):
        if self.pk is None:
            raise ValueError('Cannot delete an unsaved instance.')
        database = using or router.db_for_write(type(self), instance=self)
        # A instância já foi obtida e autorizada; o lote usa o manager base, sem escopo.
        result = SoftDeleteQuerySet.delete(type(self)._base_manager.using(database).filter(pk=self.pk), actor=actor)
        self.refresh_from_db(using=database)
        return result

    delete.alters_data = True


class SharedModel(BaseModel):
    """Dados comuns a todos os clientes, sem contrato ou organização.

    Exemplos: país, cidade e plano de assinatura. Todo usuário autenticado pode
    consultar; somente o superadmin pode alterar, conforme as camadas de autorização.
    """

    class Meta(BaseModel.Meta):
        abstract = True


class HybridScopedModel(BaseModel):
    """Dados do sistema ou de um cliente, identificados pelo campo contract.

    Exemplos: categoria padrão (contract=None) e categoria criada pelo cliente
    (contract preenchido). O cliente consulta as categorias do sistema e as suas,
    mas só altera as suas; categorias do sistema são alteradas pelo superadmin.
    """

    contract = models.ForeignKey('contracts.Contract', verbose_name=_('contrato'), on_delete=models.PROTECT,
                                 null=True, blank=True, related_name='+',)

    class Meta(BaseModel.Meta):
        abstract = True


class ContractScopedModel(BaseModel):
    """Dados de um cliente, disponíveis entre as organizações do mesmo contrato.

    Exemplo: catálogo de produtos compartilhado pelas filiais de uma empresa.
    Contract é obrigatório; outro cliente não pode consultar nem alterar esse catálogo.
    As camadas de contexto e autorização aplicam essas restrições.
    """

    contract = models.ForeignKey('contracts.Contract', verbose_name=_('contrato'), on_delete=models.PROTECT,
                                 related_name='+',)

    class Meta(BaseModel.Meta):
        abstract = True


class OrganizationScopedModel(BaseModel):
    """Dados de uma organização, com contract e organization obrigatórios.

    Exemplos: entrada de estoque de uma filial e os itens dessa entrada. Cada item
    também guarda o contexto na própria tabela; não o deduz pelo registro pai.
    Outra filial não acessa esses dados pelas camadas de contexto e autorização.
    """

    contract = models.ForeignKey('contracts.Contract', verbose_name=_('contrato'), on_delete=models.PROTECT,
                                 related_name='+',)
    organization = models.ForeignKey('contracts.Organization', verbose_name=_('organização'),
                                     on_delete=models.PROTECT, related_name='+',)

    class Meta(BaseModel.Meta):
        abstract = True
        indexes = [models.Index(fields=['contract', 'organization'])]
