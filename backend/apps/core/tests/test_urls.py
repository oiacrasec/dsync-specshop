import pytest


@pytest.mark.parametrize('path', ['/', '/admin/', '/admin/login/'])
def test_unpublished_routes_return_404_without_session(client, path):
    response = client.get(path)

    assert response.status_code == 404
    assert 'sessionid' not in response.cookies
