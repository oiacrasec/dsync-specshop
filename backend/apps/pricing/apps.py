from django.apps import AppConfig


class PricingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.pricing'

    def ready(self):
        # Registra os conectores reais das fontes (ADR 2003 §4); sem registro, a fonte fica indisponível.
        from .mercado_livre import MercadoLivreConnector
        from .sources import CONNECTORS

        connector = MercadoLivreConnector()
        CONNECTORS[connector.source] = connector
