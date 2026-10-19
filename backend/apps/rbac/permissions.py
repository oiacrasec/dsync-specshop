"""Autorização do DRF pelo RBAC híbrido (ADR 0009 §4): nega por padrão.

Uso numa view:

    class ProductViewSet(...):
        required_permission = {'list': 'product:view', 'create': 'product:create'}

`required_permission` aceita um código (vale para qualquer método) ou um dicionário por
`action` (ViewSet) ou por método HTTP. Sem declaração para a requisição, o acesso é
negado. Endpoint aberto a qualquer autenticado declara `permission_classes =
[AllowAuthenticated]` explicitamente.
"""

import logging

from rest_framework.permissions import BasePermission

from apps.core import permission_registry

from .utils import access_evaluation, contract_codes, required_permission

logger = logging.getLogger(__name__)


class AllowAuthenticated(BasePermission):
    """Marca explícita de endpoint aberto a qualquer usuário autenticado.

    `options` não é aberto: exige o código `:view` declarado, avaliado na organização ativa
    (ADR 0011), mesmo quando o recurso é aberto.
    """

    def has_permission(self, request, view):
        if getattr(view, 'action', None) == 'options':
            return RequiredPermission().has_permission(request, view)
        if not (request.user and request.user.is_authenticated):
            return False
        from apps.core.context import bind_user

        bind_user(request)
        return True


class RequiredPermission(BasePermission):
    """Exige o código declarado na view, avaliado para a organização ativa."""

    def has_permission(self, request, view):
        if not self.has_context(request, view):
            return False
        if request.user.is_superuser:
            return True
        from apps.core.context import resolve_organization

        return (
            required_permission(request, view) in access_evaluation(request, resolve_organization(request)).permissions
        )

    def has_context(self, request, view):
        """Autenticado, código declarado no registry e organização ativa acessível (400/403)."""
        user = request.user
        if not (user and user.is_authenticated):
            return False
        code = required_permission(request, view)
        if not code:
            logger.warning('Endpoint sem permissão declarada: %s', type(view).__name__)
            return False
        if code not in permission_registry.PERMISSIONS:
            logger.warning('Permissão fora do registry declarada em %s', type(view).__name__)
            return False
        if getattr(view, 'action', None) == 'options' and not code.endswith(':view'):
            return False  # Seleção é leitura: manage/create não substituem view (ADR 0011).
        # Import tardio: o DRF carrega esta classe durante a inicialização de rest_framework.views.
        from apps.core.context import bind_user, resolve_organization
        from apps.core.exceptions import ContextForbidden

        bind_user(request)

        # Endpoint de negócio sempre exige organização, inclusive para o superadmin (400 sem header).
        organization = resolve_organization(request)
        if user.is_superuser:
            return True
        if not access_evaluation(request, organization).has_access:
            raise ContextForbidden()
        return True


class ContractWidePermission(RequiredPermission):
    """Código concedido em qualquer escopo vale no contrato inteiro (organizações, ADR 0037).

    Mantém as regras de contexto dos endpoints de negócio: header obrigatório e acesso à
    organização ativa (senão 403 context-forbidden). Só a checagem do código muda: em vez da
    organização ativa, a união das concessões do usuário no contrato.
    """

    def has_permission(self, request, view):
        if not self.has_context(request, view):
            return False
        if request.user.is_superuser:
            return True
        return required_permission(request, view) in contract_codes(request)
