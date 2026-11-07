from types import SimpleNamespace

import pytest

from apps.core.permission_registry import PERMISSIONS, PermissionDefinition, PermissionRegistry, PermissionScope
from apps.rbac.catalog import load_app_catalogs
from apps.rbac.tests import catalog_app

ANY_SCOPE = frozenset(PermissionScope)


def app_config(module, name):
    return SimpleNamespace(module=module, name=name)


def test_app_catalog_adds_permissions_and_labels_then_freezes():
    registry = PermissionRegistry([PermissionDefinition('organization:view', ANY_SCOPE)])
    resources, labels = {'organization': 'Organizações'}, {}

    load_app_catalogs([app_config(catalog_app, 'apps.rbac.tests.catalog_app')], registry, resources, labels)

    assert 'widget:view' in registry
    assert resources == {'organization': 'Organizações', 'widget': 'Widgets'}
    assert labels == {'widget:view': 'Ver widgets'}
    with pytest.raises(RuntimeError):
        registry.register([PermissionDefinition('widget:create', ANY_SCOPE)])


def test_apps_without_catalog_are_skipped():
    import apps.rbac.tests as package_without_catalog

    registry = PermissionRegistry([])
    load_app_catalogs([app_config(package_without_catalog, 'apps.rbac.tests')], registry, {}, {})
    assert list(registry) == []


def test_app_catalog_cannot_override_existing_permissions_or_labels():
    registry = PermissionRegistry([PermissionDefinition('widget:view', ANY_SCOPE)])
    with pytest.raises(ValueError):
        load_app_catalogs([app_config(catalog_app, 'apps.rbac.tests.catalog_app')], registry, {}, {})

    registry = PermissionRegistry([])
    with pytest.raises(ValueError):
        load_app_catalogs([app_config(catalog_app, 'apps.rbac.tests.catalog_app')], registry, {'widget': 'Outro'}, {})


def test_live_registry_is_frozen_after_startup():
    with pytest.raises(RuntimeError):
        PERMISSIONS.register([PermissionDefinition('widget:view', ANY_SCOPE)])
