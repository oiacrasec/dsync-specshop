from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.audit'

    def ready(self):
        from . import checks  # noqa: F401 — registra o check de deploy do registro de acesso.
