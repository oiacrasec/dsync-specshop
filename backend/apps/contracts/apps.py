from django.apps import AppConfig


class ContractsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.contracts'

    def ready(self):
        from apps.core.services import BaseModelService

        from .services import ContractService, PlanService

        BaseModelService.register(PlanService)
        BaseModelService.register(ContractService)
