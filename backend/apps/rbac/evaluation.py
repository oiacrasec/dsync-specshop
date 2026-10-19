"""Permissão efetiva em Python puro (ADR 0009 §4 e §6); sem Django, DRF ou banco.

Recebe as concessões já carregadas e a organização ativa (identificador opaco) e
devolve se o usuário acessa a organização e quais códigos do registry ele tem nela.
"""

from dataclasses import dataclass

from apps.core.permission_registry import PermissionScope


@dataclass(frozen=True, slots=True)
class Grant:
    """Uma atribuição ativa: perfil (vários códigos) ou permissão avulsa (um código).

    Exemplo: Leitor no contrato inteiro, exceto a Matriz →
    Grant(CONTRACT, None, frozenset({matriz}), frozenset({'record:view'})).
    """

    scope: PermissionScope
    scope_organization: object | None
    excluded_organizations: frozenset
    codes: frozenset
    essential: bool = False

    def reaches(self, organization):
        if self.scope is PermissionScope.CONTRACT:
            return organization not in self.excluded_organizations
        return self.scope_organization == organization


@dataclass(frozen=True, slots=True)
class AccessEvaluation:
    has_access: bool
    permissions: frozenset


NO_ACCESS = AccessEvaluation(False, frozenset())


def evaluate(grants, organization, *, registry, superuser=False):
    """Nega por padrão: só conta códigos do registry permitidos no escopo da concessão.

    Superadmin tem todos os códigos. O perfil essencial (administrador do contrato)
    tem todos os códigos do registry, inclusive os criados depois. Sem organização,
    não há acesso.
    """
    if superuser:
        return AccessEvaluation(True, frozenset(definition.code for definition in registry))
    if organization is None:
        return NO_ACCESS
    reaching = [grant for grant in grants if grant.reaches(organization)]
    if not reaching:
        return NO_ACCESS
    if any(grant.essential for grant in reaching):
        return AccessEvaluation(True, frozenset(definition.code for definition in registry))
    permissions = set()
    for grant in reaching:
        for code in grant.codes:
            if code in registry and grant.scope in registry.get(code).scopes:
                permissions.add(code)
    return AccessEvaluation(True, frozenset(permissions))


def granted_codes(grants, *, registry, superuser=False):
    """Códigos concedidos em qualquer escopo do contrato, sem olhar a organização ativa.

    Para recursos cuja permissão vale no contrato inteiro quando dada em qualquer escopo
    (organizações, ADR 0037). Respeita o escopo permitido de cada código no registry.
    """
    if superuser or any(grant.essential for grant in grants):
        return frozenset(definition.code for definition in registry)
    return frozenset(
        code
        for grant in grants
        for code in grant.codes
        if code in registry and grant.scope in registry.get(code).scopes
    )
