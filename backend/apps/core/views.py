"""Views base compostas; recursos declaram querysets e herdam exclusão comum."""

from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import extend_schema
from drf_spectacular.views import SpectacularAPIView
from rest_framework import viewsets
from rest_framework.response import Response

from .filters import ValidatedDjangoFilterBackend
from .mixins import (
    ListFilterMixin,
    LookupOptionsMixin,
    ModelQuerysetMixin,
    ResourcePermissionMixin,
    SerializerDeleteMixin,
    TableSchemaMixin,
)
from .openapi import api_schema
from .pagination import StandardResultsSetPagination
from .permissions import SuperadminPermission
from .problems import problem_http_response


@transaction.non_atomic_requests
def api_not_found(request):
    return problem_http_response(request, 404)


# fmt: off
class BaseModelViewSet(ResourcePermissionMixin, SerializerDeleteMixin, ListFilterMixin, LookupOptionsMixin,
                       TableSchemaMixin, ModelQuerysetMixin, viewsets.ModelViewSet,):
    # fmt: on
    lookup_field = 'public_id'
    lookup_value_converter = 'uuid'
    pagination_class = StandardResultsSetPagination
    filter_backends = [ValidatedDjangoFilterBackend]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ('update', 'partial_update', 'destroy'):
            return queryset.select_for_update(of=('self',))
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['instance_locked'] = self.action in ('update', 'partial_update', 'destroy')
        return context


class BaseAdminModelViewSet(BaseModelViewSet):
    """CRUD global autorizado só ao superadmin, sem contexto organizacional."""

    permission_classes = [SuperadminPermission]
    options_label_field = 'name'
    options_search_fields = ('name',)


# fmt: off
class BaseReadOnlyModelViewSet(ResourcePermissionMixin, ListFilterMixin, LookupOptionsMixin, TableSchemaMixin,
                               ModelQuerysetMixin, viewsets.ReadOnlyModelViewSet,):
    # fmt: on
    lookup_field = 'public_id'
    lookup_value_converter = 'uuid'
    pagination_class = StandardResultsSetPagination
    filter_backends = [ValidatedDjangoFilterBackend]


@method_decorator(never_cache, name='dispatch')
class OpenApiSchemaView(SpectacularAPIView):
    """`/api/v1/schema/` só para autenticados; as rotas `/admin/` só para o superadmin (ADR 0004)."""

    def get_permissions(self):
        from apps.rbac.permissions import AllowAuthenticated

        return [AllowAuthenticated()]

    @extend_schema(exclude=True)
    def get(self, request, *args, **kwargs):
        return Response(api_schema(include_admin=request.user.is_superuser))
