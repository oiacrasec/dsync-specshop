from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection, transaction
from django.utils.translation import gettext_lazy as _

from apps.contracts.models import Contract, Organization
from apps.core.exceptions import ProfileInUse
from apps.core.permission_registry import PERMISSIONS, PermissionScope

from .models import Assignment, AssignmentExclusion, Profile, ProfilePermission
from .selectors import conflicting_profile_names, duplicate_client_contracts, profile_is_assigned


def _begin_write(actor):
    if actor is None or not get_user_model().objects.filter(pk=actor.pk, is_active=True, is_superuser=True).exists():
        raise PermissionDenied(_('A gestão de acesso exige autorização administrativa.'))
    # Catálogo pequeno de configuração; serializa escritas RBAC, inclusive nome híbrido.
    # Lock de transação liberado em commit/rollback; SQL fixo e parâmetro fixo.
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s)', [0x44534352424143])


def _invalid(field, message):
    raise ValidationError({field: _(message)})


def _contract(contract_id):
    if not Contract.objects.filter(pk=contract_id, is_active=True).exists():
        _invalid('contract', 'Informe um contrato disponível.')


def _profile(profile_id):
    try:
        return Profile.objects.select_for_update().get(pk=profile_id)
    except Profile.DoesNotExist:
        _invalid('profile', 'Informe um perfil disponível.')


def _mutable_profile(profile):
    if profile.system_key:
        raise PermissionDenied(_('Perfis essenciais só podem ser alterados por fixture ou migration.'))


def _permission(code, scope=None):
    try:
        definition = PERMISSIONS.get(code)
        if definition.reserved:
            _invalid('permission_code', 'Permissão reservada ao administrador do contrato.')
        if scope is not None:
            PERMISSIONS.require_assignable(code, scope)
    except KeyError, ValueError, TypeError:
        _invalid('permission_code', 'Informe uma permissão e um escopo permitidos pelo registry.')
    return definition


@transaction.atomic
def save_profile(*, profile, actor):
    _begin_write(actor)
    if profile.deleted_at is not None:
        _invalid('deleted_at', 'Use o serviço de exclusão de perfil.')
    if not profile._state.adding:
        current = Profile.objects.select_for_update().get(pk=profile.pk)
        _mutable_profile(current)
        if current.contract_id != profile.contract_id:
            _invalid('contract', 'O contrato de um perfil existente não pode ser alterado.')
    _mutable_profile(profile)
    if profile.contract_id is not None:
        _contract(profile.contract_id)
    if conflicting_profile_names(profile):
        _invalid('name', 'Já existe um perfil com esse nome no contrato ou no sistema.')
    profile.full_clean()
    profile.save(actor=actor)
    # Aviso de duplicados de clientes quando superadmin cria/renomeia perfil do sistema.
    return profile, duplicate_client_contracts(profile) if profile.contract_id is None else None


@transaction.atomic
def delete_profile(*, profile, actor):
    _begin_write(actor)
    current = Profile.objects.select_for_update().get(pk=profile.pk)
    _mutable_profile(current)
    if profile_is_assigned(current):
        raise ProfileInUse()
    current.delete(actor=actor)
    ProfilePermission.objects.filter(profile=current).delete(actor=actor)
    return current


@transaction.atomic
def save_profile_permission(*, permission, actor):
    _begin_write(actor)
    if permission.deleted_at is not None:
        _invalid('deleted_at', 'Use o serviço de exclusão de permissão do perfil.')
    profile = _profile(permission.profile_id)
    _mutable_profile(profile)
    if permission.contract_id != profile.contract_id:
        _invalid('contract', 'A permissão deve ter o mesmo contrato do perfil.')
    definition = _permission(permission.permission_code)
    scopes = set(Assignment.objects.filter(profile=profile).values_list('scope', flat=True))
    if any(PermissionScope(scope) not in definition.scopes for scope in scopes):
        _invalid('permission_code', 'A permissão não admite os escopos das atribuições existentes.')
    if not permission._state.adding:
        current = ProfilePermission.objects.get(pk=permission.pk)
        if current.profile_id != permission.profile_id:
            _invalid('profile', 'O perfil de uma permissão existente não pode ser alterado.')
    permission.full_clean()
    permission.save(actor=actor)
    return permission


@transaction.atomic
def delete_profile_permission(*, permission, actor):
    _begin_write(actor)
    current = ProfilePermission.objects.get(pk=permission.pk)
    _mutable_profile(_profile(current.profile_id))
    current.delete(actor=actor)
    return current


def _assignment_profile(assignment):
    profile = _profile(assignment.profile_id)
    if not profile.is_active:
        _invalid('profile', 'Informe um perfil ativo.')
    if profile.contract_id not in (None, assignment.contract_id):
        _invalid('profile', 'O perfil não está disponível para este contrato.')
    if profile.system_key == 'contract_admin':
        if assignment.scope != PermissionScope.CONTRACT:
            _invalid('scope', 'O administrador do contrato exige escopo de contrato.')
    else:
        codes = ProfilePermission.objects.filter(profile=profile).values_list('permission_code', flat=True)
        for code in codes:
            _permission(code, assignment.scope)  # Sem query por permissão.
    return profile


@transaction.atomic
def save_assignment(*, assignment, actor):
    _begin_write(actor)
    if assignment.deleted_at is not None:
        _invalid('deleted_at', 'Use o serviço de exclusão de atribuição.')
    try:
        user = get_user_model().objects.select_for_update().get(pk=assignment.user_id, is_superuser=False)
    except get_user_model().DoesNotExist:
        _invalid('user', 'Informe um usuário de contrato disponível.')
    if user.contract_id != assignment.contract_id:
        _invalid('user', 'Usuário e atribuição devem pertencer ao mesmo contrato.')
    _contract(assignment.contract_id)
    if not assignment._state.adding:
        current = Assignment.objects.get(pk=assignment.pk)
        if current.profile_id is not None and _profile(current.profile_id).system_key:
            raise PermissionDenied(_('A edição de administradores exige a proteção específica do domínio.'))
        if current.contract_id != assignment.contract_id:
            _invalid('contract', 'O contrato de uma atribuição existente não pode ser alterado.')
    assignment.full_clean()
    if (
        assignment.scope_organization_id is not None
        and not Organization.objects.filter(
            pk=assignment.scope_organization_id, contract_id=assignment.contract_id, is_active=True
        ).exists()
    ):
        _invalid('scope_organization', 'Informe uma organização disponível no contrato.')
    if assignment.profile_id is not None:
        profile = _assignment_profile(assignment)
    else:
        profile = None
        _permission(assignment.permission_code, assignment.scope)
    if not assignment._state.adding and AssignmentExclusion.objects.filter(assignment=assignment).exists():
        if assignment.scope != PermissionScope.CONTRACT or (profile is not None and profile.system_key):
            _invalid('scope', 'Remova as exceções antes de alterar o escopo ou atribuir o perfil essencial.')
    assignment.save(actor=actor)
    return assignment


@transaction.atomic
def delete_assignment(*, assignment, actor):
    _begin_write(actor)
    current = Assignment.objects.get(pk=assignment.pk)
    if current.profile_id is not None and _profile(current.profile_id).system_key:
        raise PermissionDenied(_('A remoção de administradores exige a proteção específica do domínio.'))
    current.delete(actor=actor)
    AssignmentExclusion.objects.filter(assignment=current).delete(actor=actor)
    return current


@transaction.atomic
def save_exclusion(*, exclusion, actor):
    _begin_write(actor)
    if exclusion.deleted_at is not None:
        _invalid('deleted_at', 'Use o serviço de exclusão de exceção.')
    assignment = Assignment.objects.get(pk=exclusion.assignment_id)
    if assignment.contract_id != exclusion.contract_id or assignment.scope != PermissionScope.CONTRACT:
        _invalid('assignment', 'Exceções exigem uma atribuição de contrato no mesmo contrato.')
    if assignment.profile_id is not None and _profile(assignment.profile_id).system_key:
        _invalid('assignment', 'O administrador do contrato não admite exceções de organização.')
    if not Organization.objects.filter(
        pk=exclusion.excluded_organization_id, contract_id=exclusion.contract_id, is_active=True
    ).exists():
        _invalid('excluded_organization', 'Informe uma organização disponível no contrato.')
    if not exclusion._state.adding:
        current = AssignmentExclusion.objects.get(pk=exclusion.pk)
        if current.assignment_id != exclusion.assignment_id:
            _invalid('assignment', 'A atribuição de uma exceção existente não pode ser alterada.')
    exclusion.full_clean()
    exclusion.save(actor=actor)
    return exclusion


@transaction.atomic
def delete_exclusion(*, exclusion, actor):
    _begin_write(actor)
    current = AssignmentExclusion.objects.get(pk=exclusion.pk)
    current.delete(actor=actor)
    return current
