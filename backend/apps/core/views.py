"""Views do core: fallback de rotas da API e mixin da camada D (ADR 0006 §1.3 e §4)."""

from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import PermissionDenied

from .models import HybridScopedModel
from .problems import problem_http_response
from .utils import context_values


@transaction.non_atomic_requests
def api_not_found(request):
    """Fallback de rotas: também evita a página de boas-vindas em DEBUG."""
    return problem_http_response(request, 404)


class TenantScopedViewMixin:
    """Para GenericAPIView/ViewSet de models com escopo.

    Declare `model` (nunca `queryset` no nível da classe: o manager com escopo exige
    contexto, que só existe durante a requisição). Leitura pelo manager com escopo;
    registro fora do contexto → 404. Create/update gravam contrato e organização do
    contexto e a autoria; valores do payload são ignorados.
    """

    model = None

    def get_queryset(self):
        return self.model.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(**context_values(self.model), created_by=user, updated_by=user)

    def perform_update(self, serializer):
        self._ensure_writable(serializer.instance)
        serializer.save(**context_values(self.model), updated_by=self.request.user)

    def perform_destroy(self, instance):
        self._ensure_writable(instance)
        instance.delete(actor=self.request.user)

    def _ensure_writable(self, instance):
        # Registro do sistema (Hybrid sem contrato) é visível ao cliente, mas só o superadmin altera (§1.1).
        if isinstance(instance, HybridScopedModel) and instance.contract_id is None:
            raise PermissionDenied(_('Registros do sistema só podem ser alterados pela administração.'))
