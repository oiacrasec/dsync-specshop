"""Views base compostas; recursos declaram selectors e herdam exclusão comum."""

from django.db import transaction
from rest_framework import viewsets

from .filters import ValidatedDjangoFilterBackend
from .mixins import (
    ListFilterMixin,
    LookupOptionsMixin,
    SelectorQuerysetMixin,
    ServiceDeleteMixin,
    TableSchemaMixin,
)
from .pagination import StandardResultsSetPagination
from .permissions import SuperadminPermission
from .problems import problem_http_response
from .services import BaseModelService


@transaction.non_atomic_requests
def api_not_found(request):
    return problem_http_response(request, 404)


# fmt: off
class BaseModelViewSet(SelectorQuerysetMixin, ServiceDeleteMixin, ListFilterMixin, LookupOptionsMixin, TableSchemaMixin,
                       viewsets.ModelViewSet,):
    # fmt: on
    lookup_field = 'public_id'
    lookup_value_converter = 'uuid'
    pagination_class = StandardResultsSetPagination
    filter_backends = [ValidatedDjangoFilterBackend]
    delete_service = staticmethod(BaseModelService.delete_instance)


class BaseAdminModelViewSet(BaseModelViewSet):
    """CRUD global autorizado só ao superadmin, sem contexto organizacional."""

    permission_classes = [SuperadminPermission]
    options_permission_class = SuperadminPermission
    options_label_field = 'name'
    options_search_fields = ('name',)
