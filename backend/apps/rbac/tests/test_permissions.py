import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import path
from rest_framework.response import Response
from rest_framework.test import APIClient
from rest_framework.views import APIView

from apps.contracts.models import Contract, Organization
from apps.core import permission_registry
from apps.core.permission_registry import PermissionDefinition, PermissionRegistry, PermissionScope
from apps.rbac import services
from apps.rbac.models import Assignment, AssignmentExclusion, Profile, ProfilePermission
from apps.rbac.permissions import AllowAuthenticated

pytestmark = [pytest.mark.django_db, pytest.mark.urls(__name__)]
PROBLEM = 'urn:datasync:problem:'


class DeclaredView(APIView):
    required_permission = 'record:view'

    def get(self, request):
        return Response(
            {'organization': str(getattr(request, 'organization', None) and request.organization.public_id)}
        )


class MethodView(APIView):
    required_permission = {'GET': 'record:view', 'POST': 'record:create'}

    def get(self, request):
        return Response({})

    def post(self, request):
        return Response({})


class UndeclaredView(APIView):
    def get(self, request):
        return Response({})


class OpenView(APIView):
    permission_classes = [AllowAuthenticated]

    def get(self, request):
        return Response({})


class UnknownCodeView(APIView):
    required_permission = 'record:unknown'

    def get(self, request):
        return Response({})


urlpatterns = [
    path('declared/', DeclaredView.as_view()),
    path('method/', MethodView.as_view()),
    path('undeclared/', UndeclaredView.as_view()),
    path('open/', OpenView.as_view()),
    path('unknown/', UnknownCodeView.as_view()),
]


@pytest.fixture(autouse=True)
def business_registry(monkeypatch):
    """Catálogo só de teste; não cadastra domínio futuro no produto."""
    registry = PermissionRegistry(
        [
            PermissionDefinition('record:view', frozenset(PermissionScope)),
            PermissionDefinition('record:create', frozenset(PermissionScope)),
            *list(permission_registry.PERMISSIONS),
        ]
    )
    monkeypatch.setattr(permission_registry, 'PERMISSIONS', registry)
    monkeypatch.setattr(services, 'PERMISSIONS', registry)
    return registry


@pytest.fixture
def admin():
    return get_user_model().objects.create_superuser(username='admin')


@pytest.fixture
def maria(user_contract):
    return get_user_model().objects.create_user(username='maria', contract=user_contract)


@pytest.fixture
def orgs(user_contract):
    return {name: Organization.objects.create(name=name, contract=user_contract) for name in ('obras', 'saude')}


def profile_with(admin, contract, name, *codes):
    profile, _ = services.save_profile(profile=Profile(name=name, contract=contract), actor=admin)
    for code in codes:
        permission = ProfilePermission(profile=profile, contract=contract, permission_code=code)
        services.save_profile_permission(permission=permission, actor=admin)
    return profile


def assign(admin, user, *, profile=None, code='', organization=None, excluded=()):
    scope = PermissionScope.ORGANIZATION if organization else PermissionScope.CONTRACT
    assignment = Assignment(
        contract_id=user.contract_id,
        user=user,
        profile=profile,
        permission_code=code,
        scope=scope,
        scope_organization=organization,
    )
    services.save_assignment(assignment=assignment, actor=admin)
    for organization_excluded in excluded:
        exclusion = AssignmentExclusion(
            assignment=assignment, contract_id=user.contract_id, excluded_organization=organization_excluded
        )
        services.save_exclusion(exclusion=exclusion, actor=admin)
    return assignment


def call(user, url, organization=None, method='get', header=None):
    client = APIClient()
    client.force_authenticate(user)
    extra = {}
    if header is not None:
        extra['HTTP_X_ORGANIZATION_ID'] = header
    elif organization is not None:
        extra['HTTP_X_ORGANIZATION_ID'] = str(organization.public_id)
    return getattr(client, method)(url, **extra)


def problem(response):
    return response.json()['type'].removeprefix(PROBLEM)


def test_view_without_declared_permission_is_denied(maria, orgs):
    assert problem(call(maria, '/undeclared/', orgs['obras'])) == 'permission-denied'


def test_unknown_declared_code_is_denied_even_for_superadmin(admin):
    assert problem(call(admin, '/unknown/')) == 'permission-denied'


def test_allow_authenticated_is_explicit_and_still_requires_login(maria):
    assert call(maria, '/open/').status_code == 200
    assert problem(APIClient().get('/open/')) == 'authentication-required'


def test_missing_or_malformed_header_is_invalid_context(admin, maria, orgs):
    assign(admin, maria, code='record:view')
    assert problem(call(maria, '/declared/')) == 'context-invalid-request'
    assert problem(call(maria, '/declared/', header='não-é-uuid')) == 'context-invalid-request'


def test_organization_of_another_contract_inactive_or_deleted_is_forbidden(admin, maria, orgs, user_contract):
    assign(admin, maria, code='record:view')
    other = Contract.objects.create(
        name='Outro', plan=user_contract.plan, start_date=user_contract.start_date, licenses=10
    )
    foreign = Organization.objects.create(name='Externa', contract=other)
    assert problem(call(maria, '/declared/', foreign)) == 'context-forbidden'
    orgs['saude'].is_active = False
    orgs['saude'].save()
    assert problem(call(maria, '/declared/', orgs['saude'])) == 'context-forbidden'
    orgs['obras'].delete()
    assert problem(call(maria, '/declared/', orgs['obras'])) == 'context-forbidden'


def test_without_any_grant_reaching_the_organization_access_is_forbidden(admin, maria, orgs):
    assert problem(call(maria, '/declared/', orgs['obras'])) == 'context-forbidden'
    assign(admin, maria, code='record:view', organization=orgs['saude'])
    assert problem(call(maria, '/declared/', orgs['obras'])) == 'context-forbidden'


def test_access_without_the_code_is_permission_denied(admin, maria, orgs, user_contract):
    assign(admin, maria, profile=profile_with(admin, user_contract, 'Vazio'))
    assert problem(call(maria, '/declared/', orgs['obras'])) == 'permission-denied'


def test_declared_code_grants_access_and_sets_request_organization(admin, maria, orgs, user_contract):
    assign(admin, maria, profile=profile_with(admin, user_contract, 'Leitor', 'record:view'))
    response = call(maria, '/declared/', orgs['obras'])
    assert response.status_code == 200
    assert response.json() == {'organization': str(orgs['obras'].public_id)}


def test_permission_by_method_and_scope(admin, maria, orgs, user_contract):
    assign(admin, maria, profile=profile_with(admin, user_contract, 'Leitor', 'record:view'))
    assign(admin, maria, code='record:create', organization=orgs['obras'])
    assert call(maria, '/method/', orgs['obras'], method='post').status_code == 200
    assert problem(call(maria, '/method/', orgs['saude'], method='post')) == 'permission-denied'
    assert call(maria, '/method/', orgs['saude']).status_code == 200


def test_exclusion_removes_access_to_the_organization(admin, maria, orgs, user_contract):
    leitor = profile_with(admin, user_contract, 'Leitor', 'record:view')
    assign(admin, maria, profile=leitor, excluded=[orgs['saude']])
    assert call(maria, '/declared/', orgs['obras']).status_code == 200
    assert problem(call(maria, '/declared/', orgs['saude'])) == 'context-forbidden'


def test_inactive_assignment_or_profile_grants_nothing(admin, maria, orgs, user_contract):
    leitor = profile_with(admin, user_contract, 'Leitor', 'record:view')
    assignment = assign(admin, maria, profile=leitor)
    assignment.is_active = False
    services.save_assignment(assignment=assignment, actor=admin)
    assert problem(call(maria, '/declared/', orgs['obras'])) == 'context-forbidden'
    assignment.is_active = True
    services.save_assignment(assignment=assignment, actor=admin)
    leitor.is_active = False
    services.save_profile(profile=leitor, actor=admin)
    assert problem(call(maria, '/declared/', orgs['obras'])) == 'context-forbidden'


def test_essential_profile_has_every_code(admin, maria, orgs):
    essential = Profile.objects.create(name='Administrador do contrato', system_key='contract_admin')
    assign(admin, maria, profile=essential)
    assert call(maria, '/method/', orgs['obras'], method='post').status_code == 200


def test_superadmin_passes_without_organization(admin):
    assert call(admin, '/declared/').status_code == 200


def test_permission_queries_do_not_grow_with_grants(admin, maria, orgs, user_contract):
    def queries():
        with CaptureQueriesContext(connection) as context:
            assert call(maria, '/declared/', orgs['obras']).status_code == 200
        return len(context.captured_queries)

    assign(admin, maria, profile=profile_with(admin, user_contract, 'Base', 'record:view'))
    few = queries()
    for index in range(30):
        organization = Organization.objects.create(name=f'org-{index}', contract=user_contract)
        assign(
            admin,
            maria,
            profile=profile_with(admin, user_contract, f'P{index}', 'record:view', 'record:create'),
            excluded=[organization],
        )
    assert queries() == few


def test_profile_of_another_contract_grants_nothing_even_if_stored(admin, maria, orgs, user_contract):
    """Defesa em profundidade: o service impede, mas a leitura também ignora o dado inconsistente."""
    other = Contract.objects.create(
        name='Outro', plan=user_contract.plan, start_date=user_contract.start_date, licenses=10
    )
    foreign = profile_with(admin, other, 'Estrangeiro', 'record:view')
    Assignment.objects.create(contract=user_contract, user=maria, profile=foreign, scope=PermissionScope.CONTRACT)
    assert problem(call(maria, '/declared/', orgs['obras'])) == 'context-forbidden'
