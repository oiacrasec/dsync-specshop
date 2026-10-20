from django.contrib.auth import get_user_model
from django.db.models import Exists, OuterRef, Prefetch, Q

from apps.core.permission_registry import PERMISSIONS, PermissionScope

from .constants import ESSENTIAL_PROFILE_KEY
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
            essential = assignment.profile.system_key == ESSENTIAL_PROFILE_KEY
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


def contract_admin_users(contract_id):
    """Admins exibidos na administração (6.7): atribuição essencial ativa com perfil ativo.

    Inclui usuários inativos (decisão 43); exclui os excluídos. Um usuário por linha
    (EXISTS, sem JOIN multiplicador); queryset lazy para paginar no banco. Acesso global
    explícito (`unscoped`): uso exclusivo da administração do superadmin (ADR 0028).
    """
    grants = Assignment.objects.unscoped().filter(
        user_id=OuterRef('pk'),
        contract_id=contract_id,
        is_active=True,
        profile__system_key=ESSENTIAL_PROFILE_KEY,
        profile__is_active=True,
        profile__deleted_at__isnull=True,
    )
    return get_user_model().objects.unscoped().filter(contract_id=contract_id).filter(Exists(grants))


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


def user_access(user):
    """Tela de acesso do usuário (8.3): organizações, perfis atribuíveis e concessões atuais.

    O essencial vem com todos os códigos do registry; é aplicado como os demais (decisão 63).

    Queries constantes: organizações, perfis + permissões, atribuições + exceções.
    """
    from apps.contracts.models import Organization

    organizations = list(
        Organization.objects.filter(contract_id=user.contract_id)
        .order_by('name', 'pk')
        .values('public_id', 'name', 'is_active')
    )
    profiles = (
        Profile.objects.filter(Q(contract_id=user.contract_id) | Q(contract__isnull=True))
        .prefetch_related(
            Prefetch('permissions', queryset=ProfilePermission.objects.only('profile_id', 'permission_code'))
        )
        .order_by('name', 'pk')
    )
    assignments = (
        Assignment.objects.filter(user=user, contract_id=user.contract_id)
        .select_related('profile', 'scope_organization')
        .prefetch_related(
            Prefetch('exclusions', queryset=AssignmentExclusion.objects.select_related('excluded_organization'))
        )
        .order_by('pk')
    )
    all_codes = sorted(definition.code for definition in PERMISSIONS)
    grants = []
    for assignment in assignments:
        grants.append(
            {
                'scope': assignment.scope,
                'organization': assignment.scope_organization.public_id if assignment.scope_organization else None,
                'profile': assignment.profile.public_id if assignment.profile else None,
                'permission': assignment.permission_code,
                'excluded_organizations': sorted(
                    (item.excluded_organization.public_id for item in assignment.exclusions.all()), key=str
                ),
                'is_active': assignment.is_active,
            }
        )
    return {
        'organizations': organizations,
        'profiles': [
            {
                'public_id': profile.public_id,
                'name': profile.name,
                'is_active': profile.is_active,
                'is_system': profile.contract_id is None,
                'is_essential': profile.system_key == ESSENTIAL_PROFILE_KEY,
                'permissions': all_codes
                if profile.system_key == ESSENTIAL_PROFILE_KEY
                else sorted(item.permission_code for item in profile.permissions.all()),
            }
            for profile in profiles
        ],
        'grants': grants,
    }
