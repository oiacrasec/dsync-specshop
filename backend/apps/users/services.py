from uuid import UUID

from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError
from django.db import router, transaction
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.contracts.models import Contract
from apps.core.exceptions import ContractInactive, LicenseLimitReached
from apps.core.models import SoftDeleteQuerySet
from apps.core.tenancy import system_scope

# Campos que mexem em papel, contrato, licença ou último admin.
RULE_FIELDS = frozenset({'is_active', 'is_superuser', 'contract', 'contract_id', 'deleted_at'})


@system_scope
def save_user(*, user, actor=None, using=None, **save_options):
    """Escrita interna: papel, contrato e licenças; autorização fica nos futuros endpoints.

    Conta também inativos, exclui soft deleted. User.save() e o manager de criação
    delegam para cá; update/bulk continuam fora das regras. `update_fields` sem campo
    de regra (ex.: last_login, password) grava direto, sem locks.
    """
    database = using or router.db_for_write(type(user), instance=user)
    update_fields = save_options.get('update_fields')
    if update_fields is not None and not RULE_FIELDS.intersection(update_fields):
        _base_save(user, using=database, actor=actor, **save_options)
        return user
    with transaction.atomic(using=database):
        current = None
        if not user._state.adding:
            current = type(user).all_objects.using(database).select_for_update().get(pk=user.pk)
            if current.contract_id != user.contract_id:
                from apps.rbac.models import Assignment

                if Assignment.objects.using(database).filter(user_id=user.pk).exists():
                    raise ValidationError(
                        {'contract': _('Remova as atribuições antes de alterar o contrato do usuário.')}
                    )
        if user.is_superuser:
            if user.contract_id is not None:
                raise ValidationError({'contract': _('Superadmin não pertence a contrato.')})
        else:
            if user.contract_id is None:
                raise ValidationError({'contract': _('Informe o contrato do usuário.')})
            try:
                contract = Contract.objects.using(database).select_for_update().get(pk=user.contract_id)
            except Contract.DoesNotExist:
                raise ValidationError({'contract': _('Informe um contrato disponível.')}) from None
            if not contract.is_available():
                raise ContractInactive()
            needs_capacity = user.deleted_at is None and (
                current is None or current.deleted_at is not None or current.contract_id != user.contract_id
            )
            if needs_capacity:
                occupied = (
                    type(user).objects.using(database).filter(contract_id=contract.pk).exclude(pk=user.pk).count()
                )
                if occupied >= contract.licenses:
                    raise LicenseLimitReached()
            if current is not None and _leaves_contract_admin(current, user):
                from apps.rbac.services import ensure_contract_keeps_admin

                ensure_contract_keeps_admin(current.contract_id, exclude_user_id=user.pk)
        _base_save(user, using=database, actor=actor, **save_options)
        _audit_superadmin(current, user, actor)
    return user


def _superadmin_events(current, user):
    """Mudanças nas contas de superadmin (ADR 0009 §7, decisão 3 da 3.6)."""
    from apps.audit.models import AuditEventType as Event

    was_admin = current is not None and current.is_superuser
    if current is None:
        return [Event.SUPERADMIN_CREATED] if user.is_superuser else []
    if was_admin != user.is_superuser:
        return [Event.SUPERADMIN_PROMOTED if user.is_superuser else Event.SUPERADMIN_DEMOTED]
    if not user.is_superuser:
        return []
    events = []
    if current.is_active != user.is_active:
        events.append(Event.SUPERADMIN_REACTIVATED if user.is_active else Event.SUPERADMIN_DEACTIVATED)
    if (current.deleted_at is None) != (user.deleted_at is None):
        events.append(Event.SUPERADMIN_RESTORED if user.deleted_at is None else Event.SUPERADMIN_DELETED)
    return events


def _superadmin_state(user):
    return {'is_superuser': user.is_superuser, 'is_active': user.is_active, 'deleted': user.deleted_at is not None}


def _audit_superadmin(current, user, actor):
    events = _superadmin_events(current, user)
    if not events:
        return
    from apps.audit.services import record

    before = None if current is None else _superadmin_state(current)
    for event in events:
        record(event, actor=actor, target=user, before=before, after=_superadmin_state(user))


def _base_save(user, **kwargs):
    """Grava sem voltar ao override de User.save (AbstractBaseUser.save e BaseModel.save seguem valendo)."""
    super(type(user), user).save(**kwargs)


def _leaves_contract_admin(current, user):
    """Desativar ou excluir um usuário que hoje é administrador ativo do contrato."""
    if not current.is_active or current.deleted_at is not None:
        return False
    if user.is_active and user.deleted_at is None:
        return False
    from apps.rbac.selectors import user_is_active_admin

    return user_is_active_admin(current)


@system_scope
def delete_user(*, user, actor=None, using=None):
    """Exclusão lógica de usuário; nunca deixa o contrato sem administrador (ADR 0009 §5).

    User.delete() e QuerySet.delete() delegam para cá; a exclusão em si usa o
    SoftDeleteQuerySet base para não voltar ao override.
    Retorna a quantidade excluída (0 se já estava excluído).
    """
    if user.pk is None:
        raise ValueError('Cannot delete an unsaved instance.')
    database = using or router.db_for_write(type(user), instance=user)
    with transaction.atomic(using=database):
        current = type(user).all_objects.using(database).select_for_update().get(pk=user.pk)
        if not current.is_superuser and current.is_active and current.deleted_at is None:
            from apps.rbac.selectors import user_is_active_admin

            if user_is_active_admin(current):
                from apps.rbac.services import ensure_contract_keeps_admin

                ensure_contract_keeps_admin(current.contract_id, exclude_user_id=current.pk)
        base = type(user).all_objects.using(database).filter(pk=current.pk)
        count, _ = SoftDeleteQuerySet.delete(base, actor=actor)
        if count and current.is_superuser:
            from apps.audit.models import AuditEventType
            from apps.audit.services import record

            before = _superadmin_state(current)
            record(
                AuditEventType.SUPERADMIN_DELETED,
                actor=actor,
                target=current,
                before=before,
                after={**before, 'deleted': True},
            )
    user.refresh_from_db(using=database)
    return count


def ensure_contract_available(user):
    """ADR 0006 §2.1/§3: contrato vencido, futuro, inativo ou excluído → 403 (o cliente desloga).

    Superadmin não tem contrato. Usa user.contract (select_related na autenticação).
    """
    if user.is_superuser:
        return
    if user.contract_id is None or not user.contract.is_available():
        raise ContractInactive()


@system_scope  # Autenticação: antes do contexto; o SimpleJWT consulta User.objects.
@transaction.atomic
def login(*, request, username, password):
    user = authenticate(request=request, username=username, password=password)
    if user is None or not api_settings.USER_AUTHENTICATION_RULE(user):
        raise AuthenticationFailed()
    ensure_contract_available(user)  # Só depois da senha válida: não revela nada a quem errou.
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _locked_refresh(raw_token):
    """Chamado dentro de atomic; serializa rotação e logout pelo jti."""
    try:
        token = RefreshToken(raw_token)
        public_id = UUID(token.get(api_settings.USER_ID_CLAIM))
    except TokenError, KeyError, ValueError, TypeError, AttributeError:
        raise InvalidToken() from None
    try:
        OutstandingToken.objects.select_for_update().get(jti=token[api_settings.JTI_CLAIM])
        # Outro processo pode ter revogado o token enquanto aguardávamos o lock.
        token.check_blacklist()
    except OutstandingToken.DoesNotExist, TokenError:
        raise InvalidToken() from None
    return token, public_id


@system_scope  # Autenticação: antes do contexto; o SimpleJWT consulta User.objects.
@transaction.atomic
def refresh_tokens(*, refresh):
    try:
        token, user_public_id = _locked_refresh(refresh)
        user = (
            get_user_model()
            .objects.unscoped()
            .select_related('contract')
            .select_for_update(of=('self',))  # Trava só o usuário; o contrato vem na mesma query.
            .get(public_id=user_public_id, is_active=True)
        )
        if not api_settings.USER_AUTHENTICATION_RULE(user):
            raise AuthenticationFailed()
        ensure_contract_available(user)
        token.blacklist()
        token.set_jti()
        token.set_exp()
        token.set_iat()
        token.outstand()
        return {'access': str(token.access_token), 'refresh': str(token)}
    except TokenError, get_user_model().DoesNotExist:
        raise InvalidToken() from None


@system_scope  # Autenticação: antes do contexto; o SimpleJWT consulta User.objects.
@transaction.atomic
def logout(*, refresh):
    try:
        token, _ = _locked_refresh(refresh)
        token.blacklist()
    except TokenError:
        raise InvalidToken() from None
