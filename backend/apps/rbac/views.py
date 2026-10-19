from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.context import resolve_organization
from apps.core.exceptions import ContextForbidden

from .permissions import AllowAuthenticated
from .selectors import accessible_organizations
from .serializers import OrganizationSummarySerializer
from .utils import access_evaluation


@method_decorator(never_cache, name='dispatch')
class MyOrganizationsView(APIView):
    """Lista para troca de contexto; sem X-Organization-Id (ADR 0006 §3.1).

    Superadmin não tem contrato: recebe lista vazia e usa a busca contrato → organização.
    """

    permission_classes = [AllowAuthenticated]

    def get(self, request):
        organizations = accessible_organizations(request.user).only('public_id', 'name')
        return Response(OrganizationSummarySerializer(organizations, many=True).data)


@method_decorator(never_cache, name='dispatch')
class MyPermissionsView(APIView):
    """Códigos efetivos na organização ativa, só para a interface (ADR 0037).

    Mesmo contexto e cálculo dos endpoints de negócio: header ausente/malformado → 400,
    organização fora do alcance → 403. Não autoriza nada: cada endpoint revalida.
    """

    permission_classes = [AllowAuthenticated]

    def get(self, request):
        evaluation = access_evaluation(request, resolve_organization(request))
        if not evaluation.has_access:
            raise ContextForbidden()
        return Response({'permissions': sorted(evaluation.permissions)})
