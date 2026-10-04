from django.db.models import Prefetch, Q

from apps.core.permission_registry import PermissionScope

from .evaluation import Grant
from .models import Assignment, AssignmentExclusion, Profile, ProfilePermission


def conflicting_profile_names(profile):
    candidates = Profile.objects.filter(name=profile.name).exclude(pk=profile.pk)
    if profile.contract_id is not None:
        candidates = candidates.filter(Q(contract_id=profile.contract_id) | Q(contract__isnull=True))
    else:
        candidates = candidates.filter(contract__isnull=True)
    return candidates.exists()


def duplicate_client_contracts(profile):
    """QuerySet de UUIDs para aviso paginável, sem carregar todos os contratos."""
    return (
        Profile.objects.filter(name=profile.name, contract__isnull=False)
        .values_list('contract__public_id', flat=True)
        .order_by('contract__public_id')
        .distinct()
    )


def profile_is_assigned(profile):
    return Assignment.objects.filter(profile=profile).exists()


def user_grants(user):
    """Concessões ativas do usuário no próprio contrato, em 3 queries constantes.

    Ignoram-se atribuições e perfis inativos ou excluídos (inativo não concede) e, por
    defesa em profundidade, perfis de outro contrato (o service já impede na escrita).
    Exceções de organização valem enquanto não excluídas, mesmo inativas: na dúvida,
    restringem (falha fechada).
    """
    if user.contract_id is None:
        return []
    assignments = (
        Assignment.objects.filter(user=user, contract_id=user.contract_id, is_active=True)
        .filter(
            Q(profile__isnull=True)
            | Q(profile__is_active=True, profile__deleted_at__isnull=True)
            & (Q(profile__contract__isnull=True) | Q(profile__contract_id=user.contract_id))
        )
        .select_related('profile')
        .prefetch_related(
            Prefetch('profile__permissions', queryset=ProfilePermission.objects.only('profile_id', 'permission_code')),
            Prefetch(
                'exclusions', queryset=AssignmentExclusion.objects.only('assignment_id', 'excluded_organization_id')
            ),
        )
        .only('scope', 'scope_organization_id', 'permission_code', 'profile__system_key')
    )
    grants = []
    for assignment in assignments:
        if assignment.profile_id is None:
            codes = frozenset({assignment.permission_code})
            essential = False
        else:
            codes = frozenset(item.permission_code for item in assignment.profile.permissions.all())
            essential = assignment.profile.system_key == 'contract_admin'
        grants.append(
            Grant(
                scope=PermissionScope(assignment.scope),
                scope_organization=assignment.scope_organization_id,
                excluded_organizations=frozenset(item.excluded_organization_id for item in assignment.exclusions.all()),
                codes=codes,
                essential=essential,
            )
        )
    return grants


ESSENTIAL_PROFILE_KEY = 'contract_admin'


def active_admin_count(contract_id, *, exclude_assignment_id=None, exclude_user_id=None):
    """Administradores ativos do contrato: atribuição essencial ativa de usuário ativo e não excluído."""
    admins = Assignment.objects.filter(
        contract_id=contract_id,
        is_active=True,
        profile__system_key=ESSENTIAL_PROFILE_KEY,
        profile__is_active=True,
        profile__deleted_at__isnull=True,
        user__is_active=True,
        user__deleted_at__isnull=True,
    )
    if exclude_assignment_id is not None:
        admins = admins.exclude(pk=exclude_assignment_id)
    if exclude_user_id is not None:
        admins = admins.exclude(user_id=exclude_user_id)
    return admins.count()


def user_is_active_admin(user):
    return user.contract_id is not None and active_admin_count(user.contract_id) != active_admin_count(
        user.contract_id, exclude_user_id=user.pk
    )


def accessible_organizations(user):
    """Organizações em que o usuário pode entrar (ADR 0009 §6): a atribuição é o acesso.

    Mesma regra do header X-Organization-Id: organização ativa e não excluída do contrato
    do usuário, alcançada por alguma concessão ativa (CONTRACT menos exceções, ou
    ORGANIZATION). Filtra no banco: 3 queries de concessões + 1 de organizações.
    """
    from apps.contracts.models import Organization

    grants = user_grants(user)
    if not grants:
        return Organization.objects.unscoped().none()  # Superadmin não tem contrato no contexto.
    organizations = Organization.objects.filter(contract_id=user.contract_id, is_active=True).order_by('name', 'pk')
    direct = {grant.scope_organization for grant in grants if grant.scope is PermissionScope.ORGANIZATION}
    contract_wide = [grant for grant in grants if grant.scope is PermissionScope.CONTRACT]
    if not contract_wide:
        return organizations.filter(pk__in=direct)
    # Fica de fora só o que todas as concessões de contrato excluem e nenhuma direta devolve.
    excluded = frozenset.intersection(*(grant.excluded_organizations for grant in contract_wide)) - direct
    return organizations.exclude(pk__in=excluded)
