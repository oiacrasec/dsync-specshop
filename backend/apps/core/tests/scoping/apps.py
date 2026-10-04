from django.apps import AppConfig


class ScopingConfig(AppConfig):
    """App só de testes (config.settings.testing): um model de cada tipo de escopo."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core.tests.scoping'
    label = 'scoping'
