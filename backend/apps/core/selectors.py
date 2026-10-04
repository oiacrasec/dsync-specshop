"""Leituras compartilhadas, sempre preservando o queryset com escopo recebido."""

from functools import reduce
from operator import or_

from django.core.exceptions import ImproperlyConfigured
from django.db.models import Q

from .constants import OPTIONS_DEFAULT_ROWS


class BaseModelSelector:
    """Leitura com o contexto atual; declare model e relações para JOIN."""

    model = None
    select_related = ()

    @classmethod
    def get_queryset(cls):
        if cls.model is None:
            raise ImproperlyConfigured('Declare the selector model before exposing its API.')
        queryset = cls.get_base_queryset()
        if cls.select_related:
            queryset = queryset.select_related(*cls.select_related)
        return queryset

    @classmethod
    def get_base_queryset(cls):
        return cls.model.objects.all()


class BaseAdminModelSelector(BaseModelSelector):
    """Leitura global explícita; use somente após autorização administrativa."""

    @classmethod
    def get_base_queryset(cls):
        return cls.model.objects.unscoped()


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
