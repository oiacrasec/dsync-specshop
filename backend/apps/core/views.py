"""Views base compostas; recursos declaram querysets e herdam exclusão comum."""

import mimetypes

from django.conf import settings
from django.db import transaction
from django.http import FileResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from drf_spectacular.views import SpectacularAPIView
from rest_framework import viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import media
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
from .storage import media_name_from_token
from .throttles import MediaDownloadThrottle


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


class MediaFileView(APIView):
    """Download de mídia do modo `filesystem` (ADR 0039): o token assinado é a credencial.

    Sem JWT porque `<img>` não envia o header; o link só é gerado para quem está autenticado e
    pode ver o arquivo. Token adulterado, vencido ou modo `s3` → 404 antes de tocar no disco.
    Limite por IP (`DJANGO_MEDIA_DOWNLOAD_RATE`) → 429.
    """

    # Só leitura: nenhum envio de arquivo passa por aqui (envio é sempre autenticado, no recurso).
    http_method_names = ['get', 'head']
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [MediaDownloadThrottle]

    @extend_schema(responses={(200, '*/*'): OpenApiTypes.BINARY})
    def get(self, request, token):
        name = media_name_from_token(token)
        if name is None or not media.is_signed_local() or not media.exists(name):
            raise NotFound()
        content_type = mimetypes.guess_type(name)[0] or 'application/octet-stream'
        response = FileResponse(media.open_file(name), content_type=content_type)
        response['Cache-Control'] = f'private, max-age={settings.MEDIA_URL_EXPIRE}'
        response['Content-Security-Policy'] = "default-src 'none'; sandbox"
        response['Content-Disposition'] = 'inline'
        return response
