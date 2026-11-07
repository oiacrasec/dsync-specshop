from apps.core.permission_registry import PermissionDefinition, PermissionScope

PERMISSIONS = [PermissionDefinition('widget:view', frozenset(PermissionScope))]
RESOURCE_LABELS = {'widget': 'Widgets'}
PERMISSION_LABELS = {'widget:view': 'Ver widgets'}
