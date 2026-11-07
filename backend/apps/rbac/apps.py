from django.apps import AppConfig
from django.apps import apps as django_apps


class RbacConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.rbac'

    def ready(self):
        from apps.core.permission_registry import PERMISSIONS

        from .catalog import load_app_catalogs
        from .constants import PERMISSION_LABELS, RESOURCE_LABELS

        # Permissões declaradas pelos apps, inclusive de projetos derivados (ADR 0044).
        load_app_catalogs(django_apps.get_app_configs(), PERMISSIONS, RESOURCE_LABELS, PERMISSION_LABELS)
