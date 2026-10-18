from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection, transaction
from django.utils.translation import gettext_lazy as _

from apps.audit.models import AuditEventType as Event
from apps.audit.services import record
from apps.audit.utils import snapshot
from apps.contracts.models import Contract, Organization
from apps.core.exceptions import LastContractAdmin, ProfileInUse
from apps.core.permission_registry import PERMISSIONS, PermissionScope
from apps.core.tenancy import system_scope

from .constants import AUDIT_FIELDS, ESSENTIAL_PROFILE_KEY
from .models import Assignment, AssignmentExclusion, Profile, ProfilePermission
from .selectors import (
    active_admin_count,
    conflicting_profile_names,
    duplicate_client_contracts,
    profile_is_assigned,
)


def begin_write(actor):
    """Exige superadmin ativo e serializa a configuração RBAC; chamar antes de outros locks."""
    if actor is None or not get_user_model().objects.filter(pk=actor.pk, is_active=True, is_superuser=True).exists():
        raise PermissionDenied(_('A gestão de acesso exige autorização administrativa.'))
    # Catálogo pequeno de configuração; serializa escritas RBAC, inclusive nome híbrido.
    # Lock de transação liberado em commit/rollback; SQL fixo e parâmetro fixo.
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s)', [0x44534352424143])


@system_scope
def ensure_contract_keeps_admin(contract_id, *, exclude_assignment_id=None, exclude_user_id=None, adding=0):
    """ADR 0009 §5: o contrato nunca fica sem administrador, nem por ação do superadmin.

    Bloqueia a linha do contrato para serializar com save_user/delete_user (mesma
    ordem de locks: usuário → contrato). `adding` conta o estado novo que continua admin.
    """
    Contract.objects.select_for_update().filter(pk=contract_id).first()
    remaining = active_admin_count(
        contract_id, exclude_assignment_id=exclude_assignment_id, exclude_user_id=exclude_user_id
    )
    if remaining + adding < 1:
        raise LastContractAdmin()


def _is_active_admin_grant(assignment):
    if not assignment.is_active or assignment.profile_id is None:
        return False
    return active_admin_count(assignment.contract_id) != active_admin_count(
        assignment.contract_id, exclude_assignment_id=assignment.pk
    )


def _snapshot(instance):
    return snapshot(instance, AUDIT_FIELDS[instance._meta.label])


def _audit_save(instance, actor, before, created, updated):
    event = created if before is None else updated
    record(
        event, actor=actor, contract_id=instance.contract_id, target=instance, before=before, after=_snapshot(instance)
    )


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


@system_scope
@transaction.atomic
def save_profile(*, profile, actor):
    begin_write(actor)
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
    before = None if profile._state.adding else _snapshot(profile)
    profile.save(actor=actor)
    _audit_save(profile, actor, before, Event.PROFILE_CREATED, Event.PROFILE_UPDATED)
    # Aviso de duplicados de clientes quando superadmin cria/renomeia perfil do sistema.
    return profile, duplicate_client_contracts(profile) if profile.contract_id is None else None


@system_scope
@transaction.atomic
def delete_profile(*, profile, actor):
    begin_write(actor)
    current = Profile.objects.select_for_update().get(pk=profile.pk)
    _mutable_profile(current)
    if profile_is_assigned(current):
        raise ProfileInUse()
    before = _snapshot(current)
    permissions = ProfilePermission.objects.filter(profile=current)
    removed = sorted(permissions.values_list('permission_code', flat=True))
    current.delete(actor=actor)
    permissions.delete(actor=actor)
    record(
        Event.PROFILE_DELETED,
        actor=actor,
        contract_id=current.contract_id,
        target=current,
        before=before,
        removed_permissions=removed,
    )
    return current


@system_scope
@transaction.atomic
def save_profile_permission(*, permission, actor):
    begin_write(actor)
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
    before = None if permission._state.adding else _snapshot(permission)
    permission.save(actor=actor)
    _audit_save(permission, actor, before, Event.PROFILE_PERMISSION_ADDED, Event.PROFILE_PERMISSION_UPDATED)
    return permission


@system_scope
@transaction.atomic
def delete_profile_permission(*, permission, actor):
    begin_write(actor)
    current = ProfilePermission.objects.get(pk=permission.pk)
    _mutable_profile(_profile(current.profile_id))
    before = _snapshot(current)
    current.delete(actor=actor)
    record(
        Event.PROFILE_PERMISSION_REMOVED, actor=actor, contract_id=current.contract_id, target=current, before=before
    )
    return current


def _assignment_profile(assignment):
    profile = _profile(assignment.profile_id)
    if not profile.is_active:
        _invalid('profile', 'Informe um perfil ativo.')
    if profile.contract_id not in (None, assignment.contract_id):
        _invalid('profile', 'O perfil não está disponível para este contrato.')
    if profile.system_key == ESSENTIAL_PROFILE_KEY:
        if assignment.scope != PermissionScope.CONTRACT:
            _invalid('scope', 'O administrador do contrato exige escopo de contrato.')
    else:
        codes = ProfilePermission.objects.filter(profile=profile).values_list('permission_code', flat=True)
        for code in codes:
            _permission(code, assignment.scope)  # Sem query por permissão.
    return profile


@system_scope
@transaction.atomic
def save_assignment(*, assignment, actor):
    begin_write(actor)
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
    if not assignment._state.adding and _is_active_admin_grant(current):
        stays_admin = assignment.is_active and profile is not None and profile.system_key == ESSENTIAL_PROFILE_KEY
        ensure_contract_keeps_admin(
            assignment.contract_id, exclude_assignment_id=current.pk, adding=int(stays_admin and user.is_active)
        )
    before = None if assignment._state.adding else _snapshot(assignment)
    assignment.save(actor=actor)
    _audit_save(assignment, actor, before, Event.ASSIGNMENT_CREATED, Event.ASSIGNMENT_UPDATED)
    return assignment


@system_scope
@transaction.atomic
def delete_assignment(*, assignment, actor):
    begin_write(actor)
    current = Assignment.objects.get(pk=assignment.pk)
    if _is_active_admin_grant(current):
        ensure_contract_keeps_admin(current.contract_id, exclude_assignment_id=current.pk)
    before = _snapshot(current)
    exclusions = AssignmentExclusion.objects.filter(assignment=current)
    removed = sorted(str(item) for item in exclusions.values_list('excluded_organization__public_id', flat=True))
    current.delete(actor=actor)
    exclusions.delete(actor=actor)
    record(
        Event.ASSIGNMENT_DELETED,
        actor=actor,
        contract_id=current.contract_id,
        target=current,
        before=before,
        removed_exclusions=removed,
    )
    return current


@system_scope
@transaction.atomic
def save_exclusion(*, exclusion, actor):
    begin_write(actor)
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
    before = None if exclusion._state.adding else _snapshot(exclusion)
    exclusion.save(actor=actor)
    _audit_save(exclusion, actor, before, Event.EXCLUSION_ADDED, Event.EXCLUSION_UPDATED)
    return exclusion


@system_scope
@transaction.atomic
def delete_exclusion(*, exclusion, actor):
    begin_write(actor)
    current = AssignmentExclusion.objects.get(pk=exclusion.pk)
    before = _snapshot(current)
    current.delete(actor=actor)
    record(Event.EXCLUSION_REMOVED, actor=actor, contract_id=current.contract_id, target=current, before=before)
    return current
