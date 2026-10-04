from uuid import uuid4

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import include, path
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import BasePermission
from rest_framework.routers import SimpleRouter
from rest_framework.test import APIClient

from apps.core import permission_registry
from apps.core.permission_registry import PermissionDefinition, PermissionRegistry, PermissionScope
from apps.core.selectors import lookup_options
from apps.core.tests.scoping.models import ScopingCategory, ScopingMovement
from apps.core.tests.test_scoped_views import client
from apps.core.tests.test_scoped_views import world as world_fixture
from apps.core.views import LookupOptionsMixin, TenantScopedViewMixin
from apps.rbac import services
from apps.rbac.models import Assignment
from apps.rbac.permissions import AllowAuthenticated

pytestmark = [pytest.mark.django_db, pytest.mark.urls(__name__)]
world = world_fixture


class CategoryViewSet(LookupOptionsMixin, TenantScopedViewMixin, viewsets.GenericViewSet):
    model = ScopingCategory
    required_permission = {'options': 'record:view'}
    options_label_field = 'name'
    options_search_fields = ('name',)


class MovementViewSet(CategoryViewSet):
    model = ScopingMovement
    options_label_field = 'product__name'
    options_search_fields = ('product__name',)


class ManageOnlyViewSet(CategoryViewSet):
    required_permission = 'record:manage'


class MissingPermissionViewSet(CategoryViewSet):
    required_permission = {}


class AuthenticatedOnlyViewSet(CategoryViewSet):
    permission_classes = [AllowAuthenticated]


class DenyAll(BasePermission):
    def has_permission(self, request, view):
        return False


class RestrictedViewSet(CategoryViewSet):
    permission_classes = [DenyAll]


router = SimpleRouter()
for prefix, view in (
    ('categories', CategoryViewSet),
    ('movements', MovementViewSet),
    ('manage-only', ManageOnlyViewSet),
    ('missing-permission', MissingPermissionViewSet),
    ('authenticated-only', AuthenticatedOnlyViewSet),
    ('restricted', RestrictedViewSet),
):
    router.register(prefix, view, basename=prefix)
urlpatterns = [path('api/v1/', include(router.urls))]


@pytest.fixture(autouse=True)
def business_registry(monkeypatch):
    registry = PermissionRegistry(
        [
            PermissionDefinition('record:manage', frozenset(PermissionScope)),
            PermissionDefinition('record:view', frozenset(PermissionScope)),
            *list(permission_registry.PERMISSIONS),
        ]
    )
    monkeypatch.setattr(permission_registry, 'PERMISSIONS', registry)
    monkeypatch.setattr(services, 'PERMISSIONS', registry)


@pytest.fixture
def readable_world(world):
    for key in ('a', 'b'):
        assignment = Assignment(
            contract=world[key]['contract'], user=world[key]['user'], permission_code='record:view', scope='CONTRACT'
        )
        services.save_assignment(assignment=assignment, actor=world['admin'])
    return world


def get_options(world, resource='categories', params=None):
    return client(world, 'a').get(f'/api/v1/{resource}/options/', params or {})


def test_uuid_and_label_only_and_explicit_search(readable_world):
    category = ScopingCategory.objects.create(name='Cimento', contract=readable_world['a']['contract'])
    ScopingCategory.objects.create(name='Madeira', contract=readable_world['a']['contract'])
    response = get_options(readable_world, params={'q': 'cim'})
    assert response.status_code == 200
    assert response.json() == {
        'data': [{'value': str(category.public_id), 'label': 'Cimento'}],
        'total_records': 1,
        'has_next': False,
    }


def test_search_never_uses_undeclared_fields(readable_world):
    product = readable_world['a']['product']
    response = get_options(readable_world, 'movements', {'q': str(product.public_id)})
    assert response.json()['total_records'] == 0


def test_inactive_resolution_and_soft_delete_with_repeated_ids(readable_world):
    contract = readable_world['a']['contract']
    inactive = ScopingCategory.objects.create(name='Inativo', contract=contract, is_active=False)
    deleted = ScopingCategory.objects.create(name='Excluído', contract=contract, deleted_at=timezone.now())
    active = readable_world['system_category']
    assert str(inactive.public_id) not in {row['value'] for row in get_options(readable_world).json()['data']}
    response = get_options(
        readable_world,
        params={'public_id': [str(inactive.public_id), str(active.public_id), str(deleted.public_id)], 'q': 'ignorado'},
    )
    assert {row['value'] for row in response.json()['data']} == {str(inactive.public_id), str(active.public_id)}
    assert response.json()['total_records'] == 2


def test_foreign_contract_ids_are_not_resolved(readable_world):
    foreign = ScopingCategory.objects.create(name='Outro', contract=readable_world['b']['contract'])
    response = get_options(readable_world, params={'public_id': [str(foreign.public_id), str(uuid4())]})
    assert response.json() == {'data': [], 'total_records': 0, 'has_next': False}


def test_organization_scope_and_related_label(readable_world):
    own = readable_world['a']['movement']
    other = ScopingMovement.objects.create(
        contract=readable_world['a']['contract'],
        organization=readable_world['a']['other_org'],
        product=readable_world['a']['product'],
    )
    response = get_options(readable_world, 'movements')
    assert response.json()['data'] == [{'value': str(own.public_id), 'label': 'prod-a'}]
    assert get_options(readable_world, 'movements', {'public_id': str(other.public_id)}).json()['data'] == []


def test_default_and_bounded_pagination(readable_world):
    contract = readable_world['a']['contract']
    ScopingCategory.objects.bulk_create([ScopingCategory(name=f'Item {i:03}', contract=contract) for i in range(105)])
    default = get_options(readable_world).json()
    assert len(default['data']) == 20 and default['total_records'] == 106 and default['has_next'] is True
    page = get_options(readable_world, params={'first': 100, 'rows': 100}).json()
    assert len(page['data']) == 6 and page['has_next'] is False
    assert get_options(readable_world, params={'first': 200}).json()['data'] == []


def test_duplicate_labels_have_deterministic_order(readable_world):
    contract = readable_world['a']['contract']
    records = [ScopingCategory.objects.create(name='Igual', contract=contract) for _ in range(3)]
    response = get_options(readable_world, params={'q': 'Igual'}).json()
    assert [row['value'] for row in response['data']] == sorted(str(record.public_id) for record in records)


@pytest.mark.parametrize(
    'params',
    [
        {'rows': 101},
        {'rows': 0},
        {'rows': 'invalid'},
        {'first': -1},
        {'first': 'invalid'},
        {'public_id': 'invalid'},
        {'public_id': ''},
        {'public_id': [str(uuid4())] * 101},
        {'q': 'x' * 256},
    ],
)
def test_invalid_input_is_rfc9457(readable_world, params):
    response = get_options(readable_world, params=params)
    assert response.status_code == 422
    assert response['Content-Type'] == 'application/problem+json'
    assert response.json()['status'] == 422 and 'errors' in response.json()


@pytest.mark.parametrize('resource', ['categories', 'manage-only', 'missing-permission', 'authenticated-only'])
def test_manage_does_not_grant_read_permission(world, resource):
    assert get_options(world, resource).status_code == 403


def test_additional_permissions_are_preserved(readable_world):
    assert get_options(readable_world, 'restricted').status_code == 403


def test_requires_authentication_and_organization(readable_world):
    assert APIClient().get('/api/v1/categories/options/').status_code == 401
    api = APIClient()
    api.force_authenticate(readable_world['a']['user'])
    assert api.get('/api/v1/categories/options/').status_code == 400
    api.credentials(HTTP_X_ORGANIZATION_ID=str(readable_world['b']['org'].public_id))
    assert api.get('/api/v1/categories/options/').status_code == 403


@pytest.mark.parametrize('count', [1, 30])
def test_related_labels_have_two_queries_and_no_model_serialization(readable_world, count, monkeypatch):
    own = readable_world['a']
    ScopingMovement.objects.bulk_create(
        [
            ScopingMovement(contract=own['contract'], organization=own['org'], product=own['product'])
            for _ in range(count - 1)
        ]
    )

    def forbidden_str(self):
        raise AssertionError('Options must not instantiate models or call __str__.')

    monkeypatch.setattr(ScopingMovement, '__str__', forbidden_str)
    with CaptureQueriesContext(connection) as queries:
        result = lookup_options(
            queryset=ScopingMovement.objects.filter(organization=own['org']),
            label_field='product__name',
            search_fields=('product__name',),
            rows=100,
        )
    assert len(result['data']) == count
    assert len(queries) == 2


@pytest.mark.parametrize('count', [1, 30])
def test_endpoint_query_budget_and_no_incidental_writes(readable_world, count):
    own = readable_world['a']
    ScopingMovement.objects.bulk_create(
        [
            ScopingMovement(contract=own['contract'], organization=own['org'], product=own['product'])
            for _ in range(count - 1)
        ]
    )
    with CaptureQueriesContext(connection) as queries:
        response = get_options(readable_world, 'movements', {'rows': 100})
    assert response.status_code == 200 and len(response.json()['data']) == count
    sql = [item['sql'].upper() for item in queries]
    assert not any(statement.startswith(('INSERT', 'UPDATE', 'DELETE')) for statement in sql)
    table = ScopingMovement._meta.db_table.upper()
    assert sum('SELECT' in statement and table in statement for statement in sql) == 2
    assert len(queries) == 7
