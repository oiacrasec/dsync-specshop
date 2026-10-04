"""Camada E (ADR 0006 §1.3): FKs restritas ao contexto e identificadas pelo public_id."""

from rest_framework import serializers

# Contexto e id interno nunca entram nem saem pelo serializer (ADR 0006 §4, ADR 0007).
HIDDEN_FIELDS = ('id', 'contract', 'organization')


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
        for name in HIDDEN_FIELDS:
            fields.pop(name, None)
        return fields
