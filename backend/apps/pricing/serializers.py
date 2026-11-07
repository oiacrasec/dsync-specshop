from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.catalog.models import TrackedProduct
from apps.core.serializers import BaseModelSerializer, PublicIdRelatedField
from apps.core.utils import context_values

from .constants import BRAZIL_STATES, MAX_PRODUCTS_PER_SEARCH, SEARCH_CREATED, SOURCE_LABELS
from .models import PriceSearch, PriceSearchItem


class PriceSearchItemSerializer(serializers.ModelSerializer):
    """Linha da tela 2a: situação e fotografia dos indicadores (somente leitura)."""

    product = serializers.UUIDField(source='product.public_id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_model = serializers.CharField(source='product.model', read_only=True)
    source_label = serializers.SerializerMethodField()

    class Meta:
        model = PriceSearchItem
        fields = (
            'public_id',
            'product',
            'product_name',
            'product_model',
            'source',
            'source_label',
            'status',
            'detail',
            'started_at',
            'finished_at',
            'offer_count',
            'min_price',
            'median_price',
            'avg_price',
            'max_price',
        )
        read_only_fields = fields

    def get_source_label(self, item) -> str:
        return SOURCE_LABELS.get(item.source, item.source)


class PriceSearchSerializer(BaseModelSerializer):
    """Cria a pesquisa e uma linha por produto × fonte, todas pendentes (ADR 2003 §4).

    A coleta não acontece aqui: a tela dispara cada linha em `/run/` (D-16, RF-25).
    """

    audit_fields = ('sources', 'seller_states', 'destination_zip')
    audit_events = {'create': SEARCH_CREATED}

    # Manager com escopo, avaliado por requisição: produto de outro contrato "não existe".
    products = PublicIdRelatedField(many=True, write_only=True, queryset=TrackedProduct.objects)
    items = PriceSearchItemSerializer(many=True, read_only=True)
    # Aceita o CEP com hífen; a validação guarda só os 8 dígitos.
    destination_zip = serializers.CharField(max_length=9, required=False, allow_blank=True)

    class Meta:
        model = PriceSearch
        fields = ('public_id', 'products', 'sources', 'seller_states', 'destination_zip', 'items', 'created_at')
        read_only_fields = ('public_id', 'items', 'created_at')

    def validate_products(self, value):
        if not value:
            raise serializers.ValidationError(_('Selecione pelo menos um produto.'))
        if len(value) > MAX_PRODUCTS_PER_SEARCH:
            raise serializers.ValidationError(
                _('Você pode pesquisar até %(limit)s produtos por vez.') % {'limit': MAX_PRODUCTS_PER_SEARCH}
            )
        if len({product.pk for product in value}) != len(value):
            raise serializers.ValidationError(_('Há produtos repetidos na seleção.'))
        return value

    def validate_sources(self, value):
        if not isinstance(value, list) or not value or any(source not in SOURCE_LABELS for source in value):
            raise serializers.ValidationError(_('Selecione fontes válidas.'))
        return list(dict.fromkeys(value))

    def validate_seller_states(self, value):
        if not isinstance(value, list) or any(state not in BRAZIL_STATES for state in value):
            raise serializers.ValidationError(_('Informe UFs válidas (ex.: SC).'))
        return sorted(set(value))

    def validate_destination_zip(self, value):
        digits = ''.join(char for char in value if char.isdigit())
        if value and len(digits) != 8:
            raise serializers.ValidationError(_('Informe o CEP com 8 dígitos.'))
        return digits

    def create_extra(self, validated_data):
        validated_data.update(context_values(PriceSearch))

    def create(self, validated_data):
        products = validated_data.pop('products')
        search = super().create(validated_data)
        context = {'contract_id': search.contract_id, 'organization_id': search.organization_id}
        PriceSearchItem.objects.bulk_create(
            PriceSearchItem(search=search, product=product, source=source, **context)
            for product in products
            for source in search.sources
        )
        return search
