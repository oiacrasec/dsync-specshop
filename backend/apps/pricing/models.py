from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.managers import GlobalOnlyManager
from apps.core.models import DscModelBase, OrganizationScopedModel


class CollectionMechanism(models.TextChoices):
    """Quem coletou a oferta (ADR 2003 §3): o servidor é confiável; o navegador, não por padrão."""

    SERVER = 'server', _('servidor')
    BROWSER = 'browser', _('navegador')


class SearchItemStatus(models.TextChoices):
    PENDING = 'pending', _('pendente')
    RUNNING = 'running', _('pesquisando')
    DONE = 'done', _('concluída')
    NO_RESULTS = 'no_results', _('sem resultado')
    UNAVAILABLE = 'unavailable', _('fonte indisponível')
    ERROR = 'error', _('erro')


class OfferCondition(models.TextChoices):
    NEW = 'new', _('novo')
    USED = 'used', _('usado')
    REFURBISHED = 'refurbished', _('recondicionado')
    UNKNOWN = 'unknown', _('não confirmada')


class InvoiceDeclaration(models.TextChoices):
    """Nota fiscal só como declarada no anúncio, nunca deduzida (RF-26, ADR 2002 item 9)."""

    DECLARED = 'declared', _('emissão declarada')
    NOT_ISSUED = 'not_issued', _('não emite')
    NOT_INFORMED = 'not_informed', _('não informada')


class PriceSearch(OrganizationScopedModel):
    """Pesquisa disparada pelo usuário numa organização (D-16, ADR 2003 §1 e §4).

    Quem pesquisou fica em `created_by`. UFs vazias = vendedor em qualquer UF (D-22).
    """

    seller_states = models.JSONField(verbose_name=_('UFs do vendedor'), default=list, blank=True)
    destination_zip = models.CharField(verbose_name=_('CEP de entrega'), max_length=8, blank=True)
    sources = models.JSONField(verbose_name=_('fontes'), default=list)

    class Meta(OrganizationScopedModel.Meta):
        abstract = False
        verbose_name = _('pesquisa de preços')
        verbose_name_plural = _('pesquisas de preços')


class PriceSearchItem(OrganizationScopedModel):
    """Produto × fonte de uma pesquisa (linha da tela 2a), com a fotografia dos indicadores.

    Os indicadores são gravados uma vez, ao concluir a linha, e não mudam depois
    (ADR 2003, decisão 3 da 2.1): a auditoria abre as ofertas elegíveis que os geraram.
    """

    search = models.ForeignKey(PriceSearch, verbose_name=_('pesquisa'), on_delete=models.PROTECT,
                               related_name='items',)
    product = models.ForeignKey('catalog.TrackedProduct', verbose_name=_('produto'), on_delete=models.PROTECT,
                                related_name='+',)
    source = models.CharField(verbose_name=_('fonte'), max_length=32)
    status = models.CharField(verbose_name=_('situação'), max_length=16, choices=SearchItemStatus.choices,
                              default=SearchItemStatus.PENDING)
    detail = models.CharField(verbose_name=_('detalhe'), max_length=255, blank=True)
    started_at = models.DateTimeField(verbose_name=_('iniciada em'), null=True, blank=True)
    finished_at = models.DateTimeField(verbose_name=_('concluída em'), null=True, blank=True)
    offer_count = models.PositiveIntegerField(verbose_name=_('ofertas elegíveis'), null=True, blank=True)
    min_price = models.DecimalField(verbose_name=_('menor preço'), max_digits=12, decimal_places=2, null=True,
                                    blank=True)
    median_price = models.DecimalField(verbose_name=_('mediana'), max_digits=12, decimal_places=2, null=True,
                                       blank=True)
    avg_price = models.DecimalField(verbose_name=_('média'), max_digits=12, decimal_places=2, null=True, blank=True)
    max_price = models.DecimalField(verbose_name=_('maior preço'), max_digits=12, decimal_places=2, null=True,
                                    blank=True)

    class Meta(OrganizationScopedModel.Meta):
        abstract = False
        verbose_name = _('item da pesquisa')
        verbose_name_plural = _('itens da pesquisa')
        constraints = [
            models.UniqueConstraint(fields=['search', 'product', 'source'], name='pricing_item_unique_product_source'),
        ]


class SearchOffer(OrganizationScopedModel):
    """Oferta vista por uma pesquisa (o que a auditoria mostra, RF-06).

    Valor ausente nunca vale zero: frete e condição de pagamento vazios = desconhecidos.
    Do vendedor, só o exibido: identificador, nome e cidade/UF (ADR 2001 §2).
    """

    item = models.ForeignKey(PriceSearchItem, verbose_name=_('item da pesquisa'), on_delete=models.PROTECT,
                             related_name='offers',)
    mechanism = models.CharField(verbose_name=_('coleta'), max_length=16, choices=CollectionMechanism.choices)
    listing_id = models.CharField(verbose_name=_('anúncio'), max_length=64)
    catalog_product_id = models.CharField(verbose_name=_('produto no catálogo da fonte'), max_length=64, blank=True)
    title = models.CharField(verbose_name=_('título'), max_length=255, blank=True)
    url = models.URLField(verbose_name=_('link'), max_length=500, blank=True)
    price = models.DecimalField(verbose_name=_('preço'), max_digits=12, decimal_places=2)
    original_price = models.DecimalField(verbose_name=_('preço anterior'), max_digits=12, decimal_places=2,
                                         null=True, blank=True)
    payment_condition = models.CharField(verbose_name=_('condição de pagamento'), max_length=64, blank=True)
    condition = models.CharField(verbose_name=_('condição'), max_length=16, choices=OfferCondition.choices,
                                 default=OfferCondition.UNKNOWN)
    invoice = models.CharField(verbose_name=_('nota fiscal'), max_length=16, choices=InvoiceDeclaration.choices,
                               default=InvoiceDeclaration.NOT_INFORMED)
    seller_id = models.CharField(verbose_name=_('vendedor na fonte'), max_length=64, blank=True)
    seller_name = models.CharField(verbose_name=_('vendedor'), max_length=120, blank=True)
    seller_city = models.CharField(verbose_name=_('cidade do vendedor'), max_length=120, blank=True)
    seller_state = models.CharField(verbose_name=_('UF do vendedor'), max_length=2, blank=True)
    shipping_cost = models.DecimalField(verbose_name=_('frete'), max_digits=12, decimal_places=2, null=True,
                                        blank=True)
    delivery_date = models.DateField(verbose_name=_('entrega estimada'), null=True, blank=True)
    observed_at = models.DateTimeField(verbose_name=_('observada em'), default=timezone.now)
    eligible = models.BooleanField(verbose_name=_('elegível'), default=False)
    ineligible_reason = models.CharField(verbose_name=_('motivo da inelegibilidade'), max_length=32, blank=True)

    class Meta(OrganizationScopedModel.Meta):
        abstract = False
        verbose_name = _('oferta da pesquisa')
        verbose_name_plural = _('ofertas da pesquisa')
        indexes = [
            *OrganizationScopedModel.Meta.indexes,
            # Auditoria: ofertas de um item por elegibilidade e preço.
            models.Index(fields=['item', 'eligible', 'price'], name='pricing_offer_item_price'),
        ]


class PriceObservation(models.Model, metaclass=DscModelBase):
    """Observação global de preço de oferta pública (ADR 2003 §2), sem dono.

    Registro sem escopo (PROJECT_UNSCOPED_RECORDS, padrão do AccessLog): só inserção, leitura
    global explícita. Tabela particionada por mês em `observed_on` pela migration; a chave
    primária composta inclui o dia, como o PostgreSQL exige, e deduplica a mesma oferta no dia.
    """

    pk = models.CompositePrimaryKey('source', 'listing_id', 'observed_on', 'price')
    source = models.CharField(verbose_name=_('fonte'), max_length=32)
    listing_id = models.CharField(verbose_name=_('anúncio'), max_length=64)
    observed_on = models.DateField(verbose_name=_('dia'))
    price = models.DecimalField(verbose_name=_('preço'), max_digits=12, decimal_places=2)
    catalog_product_id = models.CharField(verbose_name=_('produto no catálogo da fonte'), max_length=64, blank=True)
    mechanism = models.CharField(verbose_name=_('primeira coleta'), max_length=16, choices=CollectionMechanism.choices)
    server_confirmed = models.BooleanField(verbose_name=_('vista pelo servidor'), default=False)
    confirmed_contracts = models.PositiveIntegerField(verbose_name=_('empresas que enviaram'), default=0)
    quarantined = models.BooleanField(verbose_name=_('em quarentena'), default=False)
    observed_at = models.DateTimeField(verbose_name=_('primeira observação'), default=timezone.now)

    objects = GlobalOnlyManager()

    class Meta:
        verbose_name = _('observação de preço')
        verbose_name_plural = _('observações de preço')
        indexes = [
            # Série do histórico: produto do catálogo + dia, lida só pelo índice (ADR 2003 §2).
            models.Index(fields=['catalog_product_id', 'observed_on'], include=['price'],
                         name='pricing_obs_product_day'),
        ]

    def __str__(self):
        return f'{self.source} {self.listing_id} {self.observed_on} {self.price}'


class ObservationOrigin(models.Model, metaclass=DscModelBase):
    """Quem enviou cada observação (ADR 2003 §3): restrita à equipe SPECSHOP (superadmin).

    Registro sem escopo, só inserção; nenhum cliente lê. Liga a observação pela chave natural
    (a tabela particionada não aceita chave estrangeira simples).
    """

    id = models.BigAutoField(primary_key=True)
    source = models.CharField(verbose_name=_('fonte'), max_length=32)
    listing_id = models.CharField(verbose_name=_('anúncio'), max_length=64)
    observed_on = models.DateField(verbose_name=_('dia'))
    price = models.DecimalField(verbose_name=_('preço'), max_digits=12, decimal_places=2)
    mechanism = models.CharField(verbose_name=_('coleta'), max_length=16, choices=CollectionMechanism.choices)
    contract = models.ForeignKey('contracts.Contract', verbose_name=_('contrato'), on_delete=models.PROTECT,
                                 related_name='+',)
    organization = models.ForeignKey('contracts.Organization', verbose_name=_('organização'),
                                     on_delete=models.PROTECT, related_name='+',)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('usuário'), on_delete=models.PROTECT,
                             null=True, blank=True, related_name='+',)
    search_item = models.ForeignKey(PriceSearchItem, verbose_name=_('item da pesquisa'), on_delete=models.PROTECT,
                                    related_name='+',)
    created_at = models.DateTimeField(verbose_name=_('registrada em'), default=timezone.now)

    objects = GlobalOnlyManager()

    class Meta:
        verbose_name = _('origem da observação')
        verbose_name_plural = _('origens das observações')
        constraints = [
            # Uma origem por observação e item de pesquisa: reenvio da mesma linha não duplica.
            models.UniqueConstraint(fields=['source', 'listing_id', 'observed_on', 'price', 'search_item'],
                                    name='pricing_origin_unique_item'),
        ]
        indexes = [
            models.Index(fields=['contract', 'created_at'], name='pricing_origin_contract'),
            models.Index(fields=['user', 'created_at'], name='pricing_origin_user'),
        ]

    def __str__(self):
        return f'origem {self.pk}'
