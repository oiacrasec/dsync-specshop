"""Camada E (ADR 0006 §1.3): FKs restritas ao contexto e identificadas pelo public_id."""

from rest_framework import serializers

from .constants import OPTIONS_DEFAULT_ROWS, OPTIONS_MAX_ROWS, SERIALIZER_HIDDEN_FIELDS


class PublicIdRelatedField(serializers.SlugRelatedField):
    """FK pelo public_id. O queryset padrão é o manager com escopo, avaliado a cada requisição:
    registro de outro contrato ou organização responde "não existe" (anti-IDOR)."""

    def __init__(self, **kwargs):
        kwargs.setdefault('slug_field', 'public_id')
        super().__init__(**kwargs)


class ScopedModelSerializer(serializers.ModelSerializer):
    serializer_related_field = PublicIdRelatedField

    def get_fields(self):
        fields = super().get_fields()
        for name in SERIALIZER_HIDDEN_FIELDS:
            fields.pop(name, None)
        return fields


class OptionsQuerySerializer(serializers.Serializer):
    """Entrada do autocomplete; ListField lê public_id repetido no QueryDict."""

    q = serializers.CharField(required=False, allow_blank=True, default='', max_length=255)
    first = serializers.IntegerField(default=0, min_value=0)
    rows = serializers.IntegerField(default=OPTIONS_DEFAULT_ROWS, min_value=1, max_value=OPTIONS_MAX_ROWS)
    public_id = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=False, max_length=OPTIONS_MAX_ROWS
    )
