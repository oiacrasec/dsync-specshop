import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import include, path
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.test import APIClient
from rest_framework.views import APIView

from apps.audit.models import AuditEvent
from apps.audit.models import AuditEventType as Event
from apps.contracts.models import Organization
from apps.core import permission_registry
from apps.core.exceptions import LastContractAdmin
from apps.core.permission_registry import PermissionDefinition, PermissionRegistry, PermissionScope
from apps.rbac import services
from apps.rbac.models import Assignment, AssignmentExclusion, Profile, ProfilePermission
from apps.users.services import delete_user, save_user

pytestmark = [pytest.mark.django_db, pytest.mark.urls(__name__)]
PASSWORD = 'test-strong-password-123'


class OkView(APIView):
    required_permission = 'record:view'

    def get(self, request):
        return Response({})


class FailView(APIView):
    required_permission = 'record:view'

    def get(self, request):
        raise NotFound()  # DRF desfaz a transação da view; a entrada continua registrada.


urlpatterns = [
    path('api/v1/', include('config.api.v1')),
    path('ok/', OkView.as_view()),
    path('fail/', FailView.as_view()),
]


@pytest.fixture(autouse=True)
def business_registry(monkeypatch):
    registry = PermissionRegistry(
        [PermissionDefinition('record:view', frozenset(PermissionScope)), *list(permission_registry.PERMISSIONS)]
    )
    monkeypatch.setattr(permission_registry, 'PERMISSIONS', registry)
    monkeypatch.setattr(services, 'PERMISSIONS', registry)
    cache.clear()


@pytest.fixture
def admin():
    return get_user_model().objects.create_superuser(username='admin', password=PASSWORD)


@pytest.fixture
def maria(user_contract):
    return get_user_model().objects.create_user(username='maria', password=PASSWORD, contract=user_contract)


@pytest.fixture
def obras(user_contract):
    return Organization.objects.create(name='obras', contract=user_contract)


def events(event):
    return AuditEvent.objects.filter(event=event)


def last(event):
    return events(event).latest('created_at')


# Imutabilidade


def test_events_are_append_only(admin):
    audit = last(Event.SUPERADMIN_CREATED)
    with pytest.raises(TypeError):
        audit.save()
    with pytest.raises(TypeError):
        audit.delete()
    for manager in (AuditEvent.objects, AuditEvent.all_objects):
        with pytest.raises(TypeError):
            manager.all().delete()
        with pytest.raises(TypeError):
            manager.all().update(event='x')
    assert AuditEvent.objects.filter(pk=audit.pk, deleted_at__isnull=True).exists()


# Mudanças de permissão


def test_profile_lifecycle_is_audited(admin, user_contract):
    profile, _ = services.save_profile(profile=Profile(name='Leitor', contract=user_contract), actor=admin)
    created = last(Event.PROFILE_CREATED)
    assert (created.created_by, created.contract, created.target_public_id) == (admin, user_contract, profile.public_id)
    assert created.target_type == 'rbac.profile'
    assert created.changes['before'] is None and created.changes['after']['name'] == 'Leitor'
    profile.name = 'Leitor geral'
    services.save_profile(profile=profile, actor=admin)
    updated = last(Event.PROFILE_UPDATED).changes
    assert (updated['before']['name'], updated['after']['name']) == ('Leitor', 'Leitor geral')
    permission = ProfilePermission(profile=profile, contract=user_contract, permission_code='record:view')
    services.save_profile_permission(permission=permission, actor=admin)
    assert last(Event.PROFILE_PERMISSION_ADDED).changes['after']['permission_code'] == 'record:view'
    services.delete_profile(profile=profile, actor=admin)
    deleted = last(Event.PROFILE_DELETED).changes
    assert deleted['removed_permissions'] == ['record:view'] and deleted['after'] is None


def test_assignment_and_exclusion_lifecycle_is_audited(admin, maria, obras, user_contract):
    assignment = Assignment(contract=user_contract, user=maria, permission_code='record:view', scope='CONTRACT')
    services.save_assignment(assignment=assignment, actor=admin)
    after = last(Event.ASSIGNMENT_CREATED).changes['after']
    assert after['user'] == str(maria.public_id) and after['scope'] == 'CONTRACT' and after['profile'] is None
    exclusion = AssignmentExclusion(assignment=assignment, contract=user_contract, excluded_organization=obras)
    services.save_exclusion(exclusion=exclusion, actor=admin)
    assert last(Event.EXCLUSION_ADDED).changes['after']['excluded_organization'] == str(obras.public_id)
    services.delete_exclusion(exclusion=exclusion, actor=admin)
    assert last(Event.EXCLUSION_REMOVED).changes['before']['assignment'] == str(assignment.public_id)
    assignment.is_active = False
    services.save_assignment(assignment=assignment, actor=admin)
    changes = last(Event.ASSIGNMENT_UPDATED).changes
    assert (changes['before']['is_active'], changes['after']['is_active']) == (True, False)
    services.save_exclusion(
        exclusion=AssignmentExclusion(assignment=assignment, contract=user_contract, excluded_organization=obras),
        actor=admin,
    )
    services.delete_assignment(assignment=assignment, actor=admin)
    assert last(Event.ASSIGNMENT_DELETED).changes['removed_exclusions'] == [str(obras.public_id)]


def test_refused_change_leaves_no_event(admin, maria, user_contract, essential_profile):
    assignment = Assignment(contract=user_contract, user=maria, profile=essential_profile, scope='CONTRACT')
    services.save_assignment(assignment=assignment, actor=admin)
    with pytest.raises(LastContractAdmin):
        services.delete_assignment(assignment=assignment, actor=admin)
    assert not events(Event.ASSIGNMENT_DELETED).exists()


# Contas de superadmin


def test_superadmin_account_changes_are_audited(admin, user_contract):
    root = last(Event.SUPERADMIN_CREATED)
    assert root.target_public_id == admin.public_id and root.created_by is None  # createsuperuser: sistema.
    other = get_user_model().objects.create_superuser(username='other', actor=admin)
    other.is_active = False
    save_user(user=other, actor=admin)
    other.is_active = True
    save_user(user=other, actor=admin)
    other.is_superuser, other.contract = False, user_contract
    save_user(user=other, actor=admin)
    other.is_superuser, other.contract = True, None
    save_user(user=other, actor=admin)
    delete_user(user=other, actor=admin)
    trail = AuditEvent.objects.filter(target_public_id=other.public_id).order_by('created_at')
    assert list(trail.values_list('event', flat=True)) == [
        Event.SUPERADMIN_CREATED,
        Event.SUPERADMIN_DEACTIVATED,
        Event.SUPERADMIN_REACTIVATED,
        Event.SUPERADMIN_DEMOTED,
        Event.SUPERADMIN_PROMOTED,
        Event.SUPERADMIN_DELETED,
    ]
    assert last(Event.SUPERADMIN_DELETED).changes == {
        'before': {'is_superuser': True, 'is_active': True, 'deleted': False},
        'after': {'is_superuser': True, 'is_active': True, 'deleted': True},
    }


def test_common_user_changes_are_not_superadmin_events(admin, maria):
    maria.is_active = False
    save_user(user=maria, actor=admin)
    assert not AuditEvent.objects.filter(target_public_id=maria.public_id).exists()


# Entrada do superadmin em organização


def logged_client(username):
    client = APIClient()
    response = client.post('/api/v1/auth/login/', {'username': username, 'password': PASSWORD}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.json()["access"]}')
    return client


def test_superadmin_entry_is_recorded_once_per_access_token(admin, obras):
    client = logged_client('admin')
    for _ in range(3):
        assert client.get('/ok/', HTTP_X_ORGANIZATION_ID=str(obras.public_id)).status_code == 200
    entry = last(Event.SUPERADMIN_ENTERED_ORGANIZATION)
    assert events(Event.SUPERADMIN_ENTERED_ORGANIZATION).count() == 1
    assert (entry.created_by, entry.context_organization, entry.contract_id) == (admin, obras, obras.contract_id)
    assert entry.access_jti
    logged_client('admin').get('/ok/', HTTP_X_ORGANIZATION_ID=str(obras.public_id))  # Novo token.
    assert events(Event.SUPERADMIN_ENTERED_ORGANIZATION).count() == 2


def test_superadmin_entry_survives_errors_of_the_request(admin, obras):
    response = logged_client('admin').get('/fail/', HTTP_X_ORGANIZATION_ID=str(obras.public_id))
    assert response.status_code == 404
    assert events(Event.SUPERADMIN_ENTERED_ORGANIZATION).count() == 1


def test_no_entry_without_valid_context_or_for_common_users(admin, maria, obras, user_contract):
    client = logged_client('admin')
    assert client.get('/ok/').status_code == 400
    inactive = Organization.objects.create(name='inativa', contract=user_contract, is_active=False)
    assert client.get('/ok/', HTTP_X_ORGANIZATION_ID=str(inactive.public_id)).status_code == 403
    assignment = Assignment(contract=user_contract, user=maria, permission_code='record:view', scope='CONTRACT')
    services.save_assignment(assignment=assignment, actor=admin)
    assert logged_client('maria').get('/ok/', HTTP_X_ORGANIZATION_ID=str(obras.public_id)).status_code == 200
    assert not events(Event.SUPERADMIN_ENTERED_ORGANIZATION).exists()
