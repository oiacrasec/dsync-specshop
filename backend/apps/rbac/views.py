from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response

from apps.core.context import resolve_organization
from apps.core.exceptions import ContextForbidden
from apps.core.permission_registry import PERMISSIONS
from apps.core.views import BaseAPIView, BaseModelViewSet

from .constants import ACTION_LABELS, PERMISSION_LABELS, RESOURCE_LABELS
from .filters import ProfileFilterSet
from .models import Profile, ProfilePermission
from .permissions import AllowAuthenticated
from .selectors import accessible_organizations
from .serializers import OrganizationSummarySerializer, ProfileSerializer
from .utils import access_evaluation


@extend_schema(responses={200: OrganizationSummarySerializer(many=True)})
class MyOrganizationsView(BaseAPIView):
    """Lista para troca de contexto; sem X-Organization-Id (ADR 0006 §3.1).

    Superadmin não tem contrato: recebe lista vazia e usa a busca contrato → organização.
    """

    permission_classes = [AllowAuthenticated]

    def get(self, request):
        organizations = accessible_organizations(request.user).only('public_id', 'name')
        return Response(OrganizationSummarySerializer(organizations, many=True).data)


@extend_schema(
    responses={
        200: inline_serializer(
            'PermissionSummary', {'permissions': serializers.ListField(child=serializers.CharField())}
        )
    }
)
class MyPermissionsView(BaseAPIView):
    """Códigos efetivos na organização ativa, só para a interface (ADR 0037).

    Mesmo contexto e cálculo dos endpoints de negócio: header ausente/malformado → 400,
    organização fora do alcance → 403. Não autoriza nada: cada endpoint revalida.
    """

    permission_classes = [AllowAuthenticated]

    organization_header = True

    def get(self, request):
        evaluation = access_evaluation(request, resolve_organization(request))
        if not evaluation.has_access:
            raise ContextForbidden()
        return Response({'permissions': sorted(evaluation.permissions)})


CATALOG_ITEM = inline_serializer(
    'PermissionCatalogItem',
    {
        'code': serializers.CharField(),
        'action': serializers.CharField(),
        'label': serializers.CharField(),
        'scopes': serializers.ListField(child=serializers.CharField()),
        'reserved': serializers.BooleanField(),
    },
    many=True,
)


@extend_schema(
    responses={
        200: inline_serializer(
            'PermissionCatalogGroup',
            {'resource': serializers.CharField(), 'label': serializers.CharField(), 'permissions': CATALOG_ITEM},
            many=True,
        )
    }
)
class PermissionCatalogView(BaseAPIView):
    """Catálogo do registry com rótulos, agrupado por recurso, para montar as telas de acesso."""

    permission_classes = [AllowAuthenticated]

    def get(self, request):
        groups = {}
        for definition in PERMISSIONS:
            resource, action = definition.code.split(':', 1)
            group = groups.setdefault(
                resource,
                {'resource': resource, 'label': str(RESOURCE_LABELS.get(resource, resource)), 'permissions': []},
            )
            group['permissions'].append(
                {
                    'code': definition.code,
                    'action': action,
                    'label': str(PERMISSION_LABELS.get(definition.code) or ACTION_LABELS.get(action, action)),
                    'scopes': sorted(scope.value for scope in definition.scopes),
                    'reserved': definition.reserved,
                }
            )
        return Response(list(groups.values()))


class ProfileViewSet(BaseModelViewSet):
    model = Profile
    serializer_class = ProfileSerializer
    filterset_class = ProfileFilterSet
    permission_resource = 'profile'
    options_label_field = 'name'
    options_search_fields = ('name',)
    schema_columns = ('name', 'is_active')
    schema_filters = ('is_active',)

    def get_queryset(self):
        permissions = Prefetch('permissions', queryset=ProfilePermission.objects.only('profile_id', 'permission_code'))
        return super().get_queryset().prefetch_related(permissions)
