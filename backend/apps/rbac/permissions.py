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

from .utils import access_evaluation, required_permission

logger = logging.getLogger(__name__)


class AllowAuthenticated(BasePermission):
    """Marca explícita de endpoint aberto a qualquer usuário autenticado."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        from apps.core.context import bind_user

        bind_user(request)
        return True


class RequiredPermission(BasePermission):
    """Exige o código declarado na view, avaliado para a organização ativa."""

    def has_permission(self, request, view):
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
        # Import tardio: o DRF carrega esta classe durante a inicialização de rest_framework.views.
        from apps.core.context import bind_user, resolve_organization
        from apps.core.exceptions import ContextForbidden

        bind_user(request)

        # Endpoint de negócio sempre exige organização, inclusive para o superadmin (400 sem header).
        organization = resolve_organization(request)
        if user.is_superuser:
            return True
        evaluation = access_evaluation(request, organization)
        if not evaluation.has_access:
            raise ContextForbidden()
        return code in evaluation.permissions


class LookupOptionsPermission(RequiredPermission):
    """Options exige leitura explícita; manage/create não substituem view."""

    def has_permission(self, request, view):
        code = required_permission(request, view)
        if not isinstance(code, str) or not code.endswith(':view'):
            return False
        return super().has_permission(request, view)
