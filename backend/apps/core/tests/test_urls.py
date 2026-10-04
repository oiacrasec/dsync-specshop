import pytest
from django.db import transaction
from django.http import HttpResponse
from django.urls import URLResolver, clear_url_caches, path

from config.api import v1
from config.urls import urlpatterns

# Registro de acesso (4.1): sem transação externa do teste, como em produção.
pytestmark = pytest.mark.django_db(transaction=True)


@pytest.mark.parametrize('path', ['/', '/admin/', '/admin/login/'])
def test_unpublished_routes_return_404_without_session(client, path):
    response = client.get(path)

    assert response.status_code == 404
    assert 'sessionid' not in response.cookies


def test_versioned_routes_are_mounted_under_api_v1(client, monkeypatch):
    @transaction.non_atomic_requests
    def probe(request):
        return HttpResponse('probe')

    monkeypatch.setattr(v1, 'urlpatterns', [path('probe/', probe)])
    resolver = next(pattern for pattern in urlpatterns if isinstance(pattern, URLResolver))
    monkeypatch.setattr(resolver, 'url_patterns', v1.urlpatterns)
    clear_url_caches()
    try:
        assert client.get('/api/v1/probe/').content == b'probe'
        assert client.get('/probe/').status_code == 404
        assert client.get('/api/v2/probe/').status_code == 404
    finally:
        clear_url_caches()
