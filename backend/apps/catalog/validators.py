from django.utils.translation import gettext_lazy as _
from rest_framework import serializers


def validate_ean(value):
    """EAN-8 ou EAN-13 com dígito verificador (GTIN)."""
    if not value.isdigit() or len(value) not in (8, 13):
        raise serializers.ValidationError(_('Informe um EAN com 8 ou 13 dígitos.'))
    digits = [int(char) for char in value]
    body, check = digits[:-1], digits[-1]
    total = sum(digit * (3 if index % 2 == 0 else 1) for index, digit in enumerate(reversed(body)))
    if (10 - total % 10) % 10 != check:
        raise serializers.ValidationError(_('EAN inválido: confira os dígitos.'))
    return value
