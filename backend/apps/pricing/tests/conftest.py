import pytest
from django.core.cache import cache

from apps.pricing import sources


@pytest.fixture(autouse=True)
def no_real_connectors(monkeypatch):
    """Testes da pesquisa nunca chamam fonte real: o registro começa vazio e o cache, limpo.

    O conector real do Mercado Livre é registrado no `ready()` do app; aqui cada teste
    registra só o falso ou o real com transporte falso.
    """
    monkeypatch.setattr(sources, 'CONNECTORS', {})
    cache.clear()
    yield
    cache.clear()
