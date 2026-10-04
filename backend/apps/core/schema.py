"""Metadados de campos declarados, sem querysets ou leitura de registros."""

from django.core.exceptions import FieldDoesNotExist, ImproperlyConfigured
from django.db import models
from django.utils.text import capfirst


def model_field(model, name):
    try:
        field = model._meta.get_field(name)
    except FieldDoesNotExist:
        raise ImproperlyConfigured(f'Unknown schema field: {name}.') from None
    if not field.concrete or field.many_to_many:
        raise ImproperlyConfigured('Schema fields must be concrete, single-valued model fields.')
    return field


def column_schema(model, name, overrides):
    field = model_field(model, name)
    return {'field': name, 'label': capfirst(field.verbose_name), **overrides}


def filter_schema(model, name, overrides, options_url=None):
    field = model_field(model, name)
    if field.is_relation:
        kind = 'relation'
    elif field.choices:
        kind = 'choice'
    elif isinstance(field, models.BooleanField):
        kind = 'boolean'
    elif isinstance(field, models.DateTimeField):
        kind = 'datetime'
    elif isinstance(field, models.DateField):
        kind = 'date'
    elif isinstance(field, (models.IntegerField, models.FloatField, models.DecimalField)):
        kind = 'number'
    elif isinstance(field, (models.CharField, models.TextField, models.UUIDField)):
        kind = 'text'
    else:
        raise ImproperlyConfigured(f'Unsupported schema filter type: {name}.')
    result = {'field': name, 'label': capfirst(field.verbose_name), 'type': kind}
    if kind == 'relation':
        result['options_url'] = options_url
    elif kind == 'choice':
        result['choices'] = [{'value': value, 'label': label} for value, label in field.flatchoices]
    return {**result, **overrides}
