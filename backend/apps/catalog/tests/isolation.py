"""Fábricas de isolamento do catálogo, carregadas por apps/core/tests/test_isolation.py."""

from itertools import count

from apps.catalog.models import TrackedProduct

_sequence = count()

FACTORIES = {
    TrackedProduct: lambda contract, organization: TrackedProduct.objects.create(
        name=f'produto-{next(_sequence)}', model='M1', contract=contract
    ),
}
