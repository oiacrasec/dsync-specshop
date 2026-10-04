"""Views base compostas; cada recurso declara seus selectors e services."""

from django.db import transaction
from rest_framework import viewsets

from .filters import ValidatedDjangoFilterBackend
from .mixins import (
    ListFilterMixin,
    LookupOptionsMixin,
    SelectorQuerysetMixin,
    ServiceWriteMixin,
    TableSchemaMixin,
)
from .pagination import StandardResultsSetPagination
from .permissions import SuperadminPermission
from .problems import problem_http_response


@transaction.non_atomic_requests
def api_not_found(request):
    return problem_http_response(request, 404)


# fmt: off
class BaseModelViewSet(SelectorQuerysetMixin, ServiceWriteMixin, ListFilterMixin, LookupOptionsMixin, TableSchemaMixin,
                       viewsets.ModelViewSet,):
    # fmt: on
    lookup_field = 'public_id'
    lookup_value_converter = 'uuid'
    pagination_class = StandardResultsSetPagination
    filter_backends = [ValidatedDjangoFilterBackend]


class BaseAdminModelViewSet(BaseModelViewSet):
    """CRUD global autorizado só ao superadmin, sem contexto organizacional."""

    permission_classes = [SuperadminPermission]
    options_permission_class = SuperadminPermission
    options_label_field = 'name'
    options_search_fields = ('name',)
