import pytest
from django.core.exceptions import ImproperlyConfigured

from apps.contracts.views import OrganizationViewSet
from apps.core.views import BaseModelViewSet, BaseReadOnlyModelViewSet
from apps.rbac.utils import required_permission

CRUD = {
    'list': 'organization:view',
    'retrieve': 'organization:view',
    'options': 'organization:view',
    'table_schema': 'organization:view',
    'create': 'organization:create',
    'update': 'organization:update',
    'partial_update': 'organization:update',
    'destroy': 'organization:delete',
}


def test_declared_resource_generates_the_crud_map():
    assert OrganizationViewSet.required_permission == CRUD


def test_explicit_entries_override_only_the_cited_actions():
    class ExportViewSet(BaseModelViewSet):
        permission_resource = 'organization'
        required_permission = {'export': 'organization:view', 'destroy': 'organization:update'}

    assert ExportViewSet.required_permission == {
        **CRUD,
        'export': 'organization:view',
        'destroy': 'organization:update',
    }


def test_custom_actions_are_not_generated_and_stay_denied():
    class ApproveViewSet(BaseModelViewSet):
        permission_resource = 'organization'

    view = ApproveViewSet()
    view.action = 'approve'
    assert required_permission(request=type('Request', (), {'method': 'POST'})(), view=view) is None


def test_without_resource_nothing_is_generated():
    class PlainViewSet(BaseReadOnlyModelViewSet):
        pass

    assert getattr(PlainViewSet, 'required_permission', None) is None


def test_resource_requires_dict_overrides():
    with pytest.raises(ImproperlyConfigured):

        class BrokenViewSet(BaseModelViewSet):
            permission_resource = 'organization'
            required_permission = 'organization:view'


def test_subclass_does_not_mutate_the_parent_map():
    class ChildViewSet(OrganizationViewSet):
        permission_resource = 'other'

    assert ChildViewSet.required_permission['list'] == 'other:view'
    assert OrganizationViewSet.required_permission == CRUD


@pytest.mark.django_db
def test_model_builds_scoped_queryset_per_request_and_rejects_both():
    from apps.contracts.models import Organization
    from apps.core.tenancy import system_context

    class ScopedViewSet(BaseModelViewSet):
        model = Organization

    view = ScopedViewSet()
    view.action = 'partial_update'
    with system_context():
        assert 'FOR UPDATE' in str(view.get_queryset().query)
    view.action = 'list'
    with system_context():
        assert 'FOR UPDATE' not in str(view.get_queryset().query)

    class BothViewSet(BaseModelViewSet):
        model = Organization
        queryset = Organization.objects.none()

    both = BothViewSet()
    both.action = 'list'
    with pytest.raises(ImproperlyConfigured):
        both.get_queryset()
