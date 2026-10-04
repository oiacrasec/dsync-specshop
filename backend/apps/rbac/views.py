from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import AllowAuthenticated
from .selectors import accessible_organizations
from .serializers import OrganizationSummarySerializer


@method_decorator(never_cache, name='dispatch')
class MyOrganizationsView(APIView):
    """Lista para troca de contexto; sem X-Organization-Id (ADR 0006 §3.1).

    Superadmin não tem contrato: recebe lista vazia e usa a busca contrato → organização.
    """

    permission_classes = [AllowAuthenticated]

    def get(self, request):
        organizations = accessible_organizations(request.user).only('public_id', 'name')
        return Response(OrganizationSummarySerializer(organizations, many=True).data)
