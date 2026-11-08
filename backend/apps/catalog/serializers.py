from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.contracts.models import Contract
from apps.core.serializers import BaseModelSerializer
from apps.core.utils import context_values

from .constants import PRODUCT_CREATED, PRODUCT_DELETED, PRODUCT_UPDATED
from .models import TrackedProduct
from .validators import validate_ean


class TrackedProductSerializer(BaseModelSerializer):
    """CRUD do produto acompanhado; contrato vem do contexto, nunca do payload.

    A escrita bloqueia a linha do contrato para que a checagem de duplicado (nome + modelo)
    não corra entre requisições concorrentes; a constraint do banco é a última barreira.
    """

    audit_fields = ('name', 'model', 'brand', 'ean')
    audit_events = {'create': PRODUCT_CREATED, 'update': PRODUCT_UPDATED, 'delete': PRODUCT_DELETED}
    is_archived = serializers.SerializerMethodField()

    def get_is_archived(self, instance) -> bool:
        return instance.deleted_at is not None

    class Meta:
        model = TrackedProduct
        fields = ('public_id', 'name', 'model', 'brand', 'ean', 'is_archived', 'created_at', 'updated_at')
        read_only_fields = ('public_id', 'created_at', 'updated_at')

    def validate_name(self, value):
        return self._required_text(value, _('Informe o nome do produto.'))

    def validate_model(self, value):
        return self._required_text(value, _('Informe o modelo do produto.'))

    def validate_brand(self, value):
        return value.strip()

    def validate_ean(self, value):
        value = value.strip()
        return validate_ean(value) if value else value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        name = attrs.get('name', getattr(self.instance, 'name', None))
        model = attrs.get('model', getattr(self.instance, 'model', None))
        if name and model:
            contract_id = context_values(TrackedProduct)['contract_id']
            Contract.objects.select_for_update().filter(pk=contract_id).first()
            duplicates = TrackedProduct.objects.filter(contract_id=contract_id, name__iexact=name, model__iexact=model)
            if self.instance is not None:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError(
                    {'name': [_('Já existe um produto com este nome e modelo no contrato.')]}
                )
        return attrs

    def create_extra(self, validated_data):
        validated_data.update(context_values(TrackedProduct))

    @staticmethod
    def _required_text(value, message):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(message)
        return value
