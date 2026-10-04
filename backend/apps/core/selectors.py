"""Leituras compartilhadas, sempre preservando o queryset com escopo recebido."""

from functools import reduce
from operator import or_

from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError

from .constants import OPTIONS_DEFAULT_ROWS


def filter_listing(queryset, *, search_fields, ordering_fields, filter_fields, search='', ordering='name', **filters):
    """Filtra/ordena sem avaliar; paginação conta e limita o resultado depois."""
    filters.pop('first', None)
    filters.pop('rows', None)
    fields = ordering.split(',')
    if any(field.removeprefix('-') not in ordering_fields for field in fields):
        raise ValidationError({'ordering': _('Informe campos de ordenação permitidos.')})
    if search:
        conditions = (Q(**{f'{field}__icontains': search}) for field in search_fields)
        queryset = queryset.filter(reduce(or_, conditions))
    for field, value in filters.items():
        if value is None:
            continue
        if field not in filter_fields:
            raise ValidationError({field: _('Este filtro não está disponível para este recurso.')})
        queryset = queryset.filter(**{filter_fields[field]: value})
    return queryset.order_by(*fields, 'public_id')


def lookup_options(*, queryset, label_field, search_fields, q='', first=0, rows=OPTIONS_DEFAULT_ROWS, public_id=None):
    """Projeção de duas colunas, sem instanciar models nem executar __str__."""
    queryset = queryset.filter(deleted_at__isnull=True)
    if public_id is not None:
        # Resolver seleções existentes inclui inativos e não depende do texto digitado.
        queryset = queryset.filter(public_id__in=public_id)
    else:
        queryset = queryset.filter(is_active=True)
        if q:
            conditions = (Q(**{f'{field}__icontains': q}) for field in search_fields)
            queryset = queryset.filter(reduce(or_, conditions))

    projected = queryset.values('public_id', label_field).order_by(label_field, 'public_id')
    total = projected.count()
    data = [
        {'value': str(item['public_id']), 'label': str(item[label_field])} for item in projected[first : first + rows]
    ]
    return {'data': data, 'total_records': total, 'has_next': first + len(data) < total}
