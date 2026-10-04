from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.urls import include, path
from rest_framework import viewsets
from rest_framework.routers import SimpleRouter
from rest_framework.test import APIClient

from apps.contracts.models import Contract, Organization, Plan
from apps.core import permission_registry
from apps.core.mixins import TenantScopedViewMixin
from apps.core.permission_registry import PermissionDefinition, PermissionRegistry, PermissionScope
from apps.core.serializers import ScopedModelSerializer
from apps.core.tests.scoping.models import ScopingCategory, ScopingMovement, ScopingProduct
from apps.rbac import services
from apps.rbac.models import Assignment

pytestmark = [pytest.mark.django_db, pytest.mark.urls(__name__)]


class MovementSerializer(ScopedModelSerializer):
    class Meta:
        model = ScopingMovement
        fields = ['public_id', 'product', 'category', 'quantity', 'contract', 'organization']


class CategorySerializer(ScopedModelSerializer):
    class Meta:
        model = ScopingCategory
        fields = ['public_id', 'name']


class MovementViewSet(TenantScopedViewMixin, viewsets.ModelViewSet):
    model = ScopingMovement
    serializer_class = MovementSerializer
    lookup_field = 'public_id'
    required_permission = 'record:manage'


class CategoryViewSet(TenantScopedViewMixin, viewsets.ModelViewSet):
    model = ScopingCategory
    serializer_class = CategorySerializer
    lookup_field = 'public_id'
    required_permission = 'record:manage'


router = SimpleRouter()
router.register('movements', MovementViewSet, basename='movement')
router.register('categories', CategoryViewSet, basename='category')
urlpatterns = [path('', include(router.urls))]


@pytest.fixture(autouse=True)
def business_registry(monkeypatch):
    registry = PermissionRegistry(
        [PermissionDefinition('record:manage', frozenset(PermissionScope)), *list(permission_registry.PERMISSIONS)]
    )
    monkeypatch.setattr(permission_registry, 'PERMISSIONS', registry)
    monkeypatch.setattr(services, 'PERMISSIONS', registry)


@pytest.fixture
def world():
    admin = get_user_model().objects.create_superuser(username='admin')
    plan = Plan.objects.create(name='P')
    data = {'admin': admin}
    for key in ('a', 'b'):
        contract = Contract.objects.create(name=key, plan=plan, start_date=date(2020, 1, 1), licenses=5)
        user = get_user_model().objects.create_user(username=f'user-{key}', contract=contract)
        assignment = Assignment(contract=contract, user=user, permission_code='record:manage', scope='CONTRACT')
        services.save_assignment(assignment=assignment, actor=admin)
        product = ScopingProduct.objects.create(name=f'prod-{key}', contract=contract)
        data[key] = {
            'contract': contract,
            'user': user,
            'product': product,
            'org': Organization.objects.create(name=f'org-{key}', contract=contract),
            'other_org': Organization.objects.create(name=f'outra-{key}', contract=contract),
        }
        org = data[key]['org']
        data[key]['movement'] = ScopingMovement.objects.create(contract=contract, organization=org, product=product)
    data['system_category'] = ScopingCategory.objects.create(name='sistema')
    return data


def client(world, key, organization=None):
    api = APIClient()
    api.force_authenticate(world[key]['user'])
    api.credentials(HTTP_X_ORGANIZATION_ID=str((organization or world[key]['org']).public_id))
    return api


def test_create_takes_context_from_header_and_ignores_payload(world):
    payload = {
        'product': str(world['a']['product'].public_id),
        'quantity': 3,
        'contract': world['b']['contract'].pk,
        'organization': str(world['b']['org'].public_id),
    }
    response = client(world, 'a').post('/movements/', payload, format='json')
    assert response.status_code == 201, response.content
    assert set(response.json()) == {'public_id', 'product', 'category', 'quantity'}  # Sem id nem contexto.
    created = ScopingMovement.objects.get(public_id=response.json()['public_id'])
    assert (created.contract, created.organization) == (world['a']['contract'], world['a']['org'])
    assert created.created_by == world['a']['user']


def test_foreign_key_of_another_contract_is_rejected_as_nonexistent(world):
    payload = {'product': str(world['b']['product'].public_id), 'quantity': 1}
    response = client(world, 'a').post('/movements/', payload, format='json')
    assert response.status_code == 422
    assert 'product' in response.content.decode()
    assert not ScopingMovement.objects.filter(product=world['b']['product'], contract=world['a']['contract']).exists()


def test_records_outside_the_context_respond_404(world):
    other_contract = world['b']['movement'].public_id
    assert client(world, 'a').get(f'/movements/{other_contract}/').status_code == 404
    same_contract_other_org = client(world, 'a', organization=world['a']['other_org'])
    assert same_contract_other_org.get(f'/movements/{world["a"]["movement"].public_id}/').status_code == 404
    assert [item['public_id'] for item in client(world, 'a').get('/movements/').json()] == [
        str(world['a']['movement'].public_id)
    ]


def test_update_cannot_move_the_record_to_another_context(world):
    movement = world['a']['movement']
    payload = {'quantity': 9, 'organization': str(world['b']['org'].public_id)}
    response = client(world, 'a').patch(f'/movements/{movement.public_id}/', payload, format='json')
    assert response.status_code == 200
    movement.refresh_from_db()
    assert (movement.quantity, movement.organization) == (9, world['a']['org'])


def test_system_records_are_visible_but_not_writable_by_clients(world):
    api = client(world, 'a')
    system = world['system_category']
    assert api.get(f'/categories/{system.public_id}/').status_code == 200
    assert api.patch(f'/categories/{system.public_id}/', {'name': 'x'}, format='json').status_code == 403
    assert api.delete(f'/categories/{system.public_id}/').status_code == 403
    created = api.post('/categories/', {'name': 'minha'}, format='json')
    assert created.status_code == 201
    assert ScopingCategory.objects.get(public_id=created.json()['public_id']).contract == world['a']['contract']


def test_delete_is_soft_and_audited_by_actor(world):
    movement = world['a']['movement']
    assert client(world, 'a').delete(f'/movements/{movement.public_id}/').status_code == 204
    movement.refresh_from_db()
    assert movement.deleted_at is not None and movement.deleted_by == world['a']['user']


def test_superadmin_acts_inside_the_organization_of_the_header(world):
    api = APIClient()
    api.force_authenticate(world['admin'])
    api.credentials(HTTP_X_ORGANIZATION_ID=str(world['b']['org'].public_id))
    listed = api.get('/movements/').json()
    assert [item['public_id'] for item in listed] == [str(world['b']['movement'].public_id)]
