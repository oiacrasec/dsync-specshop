from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.test import APIClient
from rest_framework.views import APIView

from apps.contracts.models import Contract, Organization, Plan
from apps.core.tenancy import TenantContext, TenantContextMissing, get_context, system_context, use_context
from apps.core.tests.scoping.models import ScopingCategory, ScopingCountry, ScopingMovement, ScopingProduct

pytestmark = [pytest.mark.django_db, pytest.mark.urls(__name__)]


class ContextProbeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'context': repr(get_context())})


urlpatterns = [path('probe/', ContextProbeView.as_view())]


@pytest.fixture
def world():
    """Dois contratos (A e B), cada um com uma organização e um registro de cada tipo."""
    plan = Plan.objects.create(name='P')
    data = {}
    for key in ('a', 'b'):
        contract = Contract.objects.create(name=key, plan=plan, start_date=date(2020, 1, 1), licenses=5)
        organization = Organization.objects.create(name=f'org-{key}', contract=contract)
        product = ScopingProduct.objects.create(name=f'prod-{key}', contract=contract)
        data[key] = {
            'contract': contract,
            'organization': organization,
            'product': product,
            'category': ScopingCategory.objects.create(name=f'cat-{key}', contract=contract),
            'movement': ScopingMovement.objects.create(contract=contract, organization=organization, product=product),
            'user': get_user_model().objects.create_user(username=f'user-{key}', contract=contract),
        }
    data['system_category'] = ScopingCategory.objects.create(name='cat-sistema')
    data['country'] = ScopingCountry.objects.create(name='Brasil')
    return data


def client_context(world, key, organization=True):
    return TenantContext(
        contract_id=world[key]['contract'].pk,
        organization_id=world[key]['organization'].pk if organization else None,
    )


def names(queryset):
    return sorted(str(item) if not hasattr(item, 'name') else item.name for item in queryset)


@pytest.mark.parametrize('model', [ScopingCategory, ScopingProduct, ScopingMovement, Organization, Contract])
def test_without_context_every_scoped_query_fails(model, world):
    with use_context(None):
        with pytest.raises(TenantContextMissing):
            list(model.objects.all())
        with pytest.raises(TenantContextMissing):
            list(model.all_objects.all())
        with pytest.raises(TenantContextMissing):
            list(get_user_model().objects.all())


def test_shared_models_need_no_context(world):
    with use_context(None):
        assert names(ScopingCountry.objects.all()) == ['Brasil']


def test_contract_context_filters_each_scope_type(world):
    with use_context(client_context(world, 'a', organization=False)):
        assert names(ScopingProduct.objects.all()) == ['prod-a']
        assert names(ScopingCategory.objects.all()) == ['cat-a', 'cat-sistema']  # Hybrid: sistema + próprio.
        assert names(Organization.objects.all()) == ['org-a']
        assert list(Contract.objects.all()) == [world['a']['contract']]
        assert list(get_user_model().objects.all()) == [world['a']['user']]  # Superadmins e outros contratos fora.
        with pytest.raises(TenantContextMissing):  # Organização exigida pelo tipo.
            list(ScopingMovement.objects.all())


def test_organization_context_filters_organization_scoped_models(world):
    with use_context(client_context(world, 'a')):
        assert list(ScopingMovement.objects.all()) == [world['a']['movement']]
        assert not ScopingMovement.objects.filter(pk=world['b']['movement'].pk).exists()


def test_superadmin_without_organization_needs_unscoped(world):
    with use_context(TenantContext(superuser=True)):
        with pytest.raises(TenantContextMissing):
            list(ScopingProduct.objects.all())
        assert ScopingProduct.objects.unscoped().count() == 2
        assert ScopingMovement.all_objects.unscoped().count() == 2


def test_all_objects_keeps_scope_and_includes_deleted(world):
    world['a']['product'].delete()
    with use_context(client_context(world, 'a', organization=False)):
        assert not ScopingProduct.objects.exists()
        assert list(ScopingProduct.all_objects.all()) == [world['a']['product']]
        assert ScopingProduct.all_objects.count() == 1  # Contrato B continua fora.


def test_foreign_keys_follow_through_the_unscoped_base_manager(world):
    movement = world['a']['movement']
    with use_context(None):
        movement.refresh_from_db()
        assert movement.product.name == 'prod-a'


def test_system_context_sees_everything(world):
    with use_context(None), system_context():
        assert ScopingMovement.objects.count() == 2


def test_each_request_starts_without_context_and_restores_the_previous(world):
    assert get_context().system
    response = APIClient().get('/probe/')
    assert response.json() == {'context': 'None'}
    assert get_context().system
