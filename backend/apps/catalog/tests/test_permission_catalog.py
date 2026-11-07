import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.core.permission_registry import PERMISSIONS, PermissionScope

pytestmark = pytest.mark.django_db


def test_product_permissions_are_registered_in_any_scope():
    for code in ('product:view', 'product:create', 'product:update', 'product:delete'):
        definition = PERMISSIONS.get(code)
        assert definition.scopes == frozenset(PermissionScope) and not definition.reserved


def test_permission_catalog_shows_products_with_archive_label(user_contract):
    user = get_user_model().objects.create_user(username='maria', contract=user_contract)
    api = APIClient()
    api.force_authenticate(user)

    response = api.get('/api/v1/permissions/')
    assert response.status_code == 200, response.content
    group = next(item for item in response.json() if item['resource'] == 'product')
    assert group['label'] == 'Produtos'
    assert {item['code']: item['label'] for item in group['permissions']}['product:delete'] == 'Arquivar'
