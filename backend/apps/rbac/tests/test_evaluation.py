import ast
from pathlib import Path

from apps.core.permission_registry import PermissionDefinition, PermissionRegistry, PermissionScope
from apps.rbac.evaluation import Grant, evaluate, granted_codes

CONTRACT, ORGANIZATION = PermissionScope.CONTRACT, PermissionScope.ORGANIZATION
REGISTRY = PermissionRegistry(
    [
        PermissionDefinition('record:view', frozenset(PermissionScope)),
        PermissionDefinition('record:create', frozenset(PermissionScope)),
        PermissionDefinition('record:contract', frozenset({CONTRACT})),
    ]
)
ALL = frozenset({'record:view', 'record:create', 'record:contract'})


def grant(scope=CONTRACT, organization=None, excluded=(), codes=('record:view',), essential=False, without=()):
    return Grant(scope, organization, frozenset(excluded), frozenset(codes), essential, frozenset(without))


def test_contract_grant_reaches_every_organization_except_exclusions():
    grants = [grant(excluded={'matriz'})]
    assert evaluate(grants, 'obras', registry=REGISTRY).permissions == {'record:view'}
    excluded = evaluate(grants, 'matriz', registry=REGISTRY)
    assert not excluded.has_access and excluded.permissions == frozenset()


def test_organization_grant_reaches_only_its_organization():
    grants = [grant(ORGANIZATION, 'obras', codes=('record:create',))]
    assert evaluate(grants, 'obras', registry=REGISTRY).permissions == {'record:create'}
    assert not evaluate(grants, 'saude', registry=REGISTRY).has_access


def test_permissions_are_the_union_of_grants_reaching_the_organization():
    grants = [
        grant(excluded={'educacao'}),  # Leitor no contrato, exceto Educação.
        grant(ORGANIZATION, 'obras', codes=('record:create',)),  # Editor em Obras.
    ]
    assert evaluate(grants, 'obras', registry=REGISTRY).permissions == {'record:view', 'record:create'}
    assert evaluate(grants, 'saude', registry=REGISTRY).permissions == {'record:view'}
    assert not evaluate(grants, 'educacao', registry=REGISTRY).has_access


def test_exclusion_restricts_only_its_own_grant():
    grants = [grant(excluded={'matriz'}), grant(ORGANIZATION, 'matriz', codes=('record:create',))]
    assert evaluate(grants, 'matriz', registry=REGISTRY).permissions == {'record:create'}


def test_access_without_codes_is_access_without_permissions():
    evaluation = evaluate([grant(codes=())], 'obras', registry=REGISTRY)
    assert evaluation.has_access and evaluation.permissions == frozenset()


def test_unknown_codes_and_disallowed_scopes_are_ignored():
    grants = [grant(ORGANIZATION, 'obras', codes=('record:contract', 'record:removed', 'record:view'))]
    assert evaluate(grants, 'obras', registry=REGISTRY).permissions == {'record:view'}


def test_essential_profile_has_every_registry_code_including_new_ones():
    assert evaluate([grant(codes=(), essential=True)], 'obras', registry=REGISTRY).permissions == ALL
    bigger = PermissionRegistry([*REGISTRY, PermissionDefinition('record:export', frozenset(PermissionScope))])
    assert 'record:export' in evaluate([grant(codes=(), essential=True)], 'obras', registry=bigger).permissions


def test_superuser_has_every_code_and_no_organization_means_no_access():
    assert evaluate([], None, registry=REGISTRY, superuser=True).permissions == ALL
    assert not evaluate([grant()], None, registry=REGISTRY).has_access
    assert not evaluate([], 'obras', registry=REGISTRY).has_access


def test_evaluation_does_not_import_framework_or_database():
    tree = ast.parse((Path(__file__).parents[1] / 'evaluation.py').read_text(encoding='utf-8'))
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            assert node.module.split('.')[0] not in {'django', 'rest_framework'}
            assert not node.module.startswith('apps.') or node.module == 'apps.core.permission_registry'
        elif isinstance(node, ast.Import):
            assert all(alias.name.split('.')[0] not in {'django', 'rest_framework'} for alias in node.names)


def test_permission_exception_removes_one_code_of_the_profile_only_where_declared():
    # ADR 0038: Operador no contrato, sem "create" só em Obras.
    grants = [grant(codes=('record:view', 'record:create'), without={('obras', 'record:create')})]
    assert evaluate(grants, 'obras', registry=REGISTRY).permissions == {'record:view'}
    assert evaluate(grants, 'saude', registry=REGISTRY).permissions == {'record:view', 'record:create'}
    assert granted_codes(grants, registry=REGISTRY) == {'record:view', 'record:create'}


def test_permission_exception_without_organization_applies_everywhere_but_other_grants_still_count():
    grants = [
        grant(ORGANIZATION, 'obras', codes=('record:view', 'record:create'), without={(None, 'record:create')}),
        grant(ORGANIZATION, 'saude', codes=('record:create',)),
    ]
    assert evaluate(grants, 'obras', registry=REGISTRY).permissions == {'record:view'}
    assert evaluate(grants, 'saude', registry=REGISTRY).permissions == {'record:create'}
    assert granted_codes(grants[:1], registry=REGISTRY) == {'record:view'}
