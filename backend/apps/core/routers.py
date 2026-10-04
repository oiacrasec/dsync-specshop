"""Router com metadados de options para os schemas, sem acesso ao banco."""

from django.core.exceptions import ImproperlyConfigured
from rest_framework.routers import SimpleRouter


class SchemaRouter(SimpleRouter):
    def get_urls(self):
        self._schema_options_routes = {}
        for _, viewset, basename in self.registry:
            serializer = getattr(viewset, 'serializer_class', None)
            model = getattr(getattr(serializer, 'Meta', None), 'model', None)
            if model is None or not any(action.url_name == 'options' for action in viewset.get_extra_actions()):
                continue
            if model in self._schema_options_routes:
                raise ImproperlyConfigured('Declare a unique options route per model in each schema router.')
            self._schema_options_routes[model] = f'{basename}-options'
        return super().get_urls()

    def get_routes(self, viewset):
        routes = super().get_routes(viewset)
        if not hasattr(viewset, 'schema_options_routes'):
            return routes
        return [
            route._replace(initkwargs={**route.initkwargs, 'schema_options_routes': self._schema_options_routes})
            for route in routes
        ]
