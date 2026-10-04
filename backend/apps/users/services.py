from uuid import UUID

from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError
from django.db import router, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.contracts.models import Contract
from apps.core.exceptions import ContractInactive, LicenseLimitReached


def save_user(*, user, actor=None, using=None):
    """Escrita interna: papel, contrato e licenças; autorização fica nos futuros endpoints.

    Conta também inativos, exclui soft deleted. Manager de criação e futuras
    escritas de vínculo/restauração devem passar por aqui, nunca por update/bulk.
    """
    database = using or router.db_for_write(type(user), instance=user)
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
            today = timezone.localdate()
            if (
                not contract.is_active
                or contract.start_date > today
                or (contract.end_date is not None and contract.end_date < today)
            ):
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
        user.save(using=database, actor=actor)
    return user


def _leaves_contract_admin(current, user):
    """Desativar ou excluir um usuário que hoje é administrador ativo do contrato."""
    if not current.is_active or current.deleted_at is not None:
        return False
    if user.is_active and user.deleted_at is None:
        return False
    from apps.rbac.selectors import user_is_active_admin

    return user_is_active_admin(current)


def delete_user(*, user, actor=None, using=None):
    """Exclusão lógica de usuário; nunca deixa o contrato sem administrador (ADR 0009 §5).

    Use este service em vez de user.delete(): o model não conhece a regra do RBAC.
    """
    database = using or router.db_for_write(type(user), instance=user)
    with transaction.atomic(using=database):
        current = type(user).all_objects.using(database).select_for_update().get(pk=user.pk)
        if not current.is_superuser and current.is_active and current.deleted_at is None:
            from apps.rbac.selectors import user_is_active_admin

            if user_is_active_admin(current):
                from apps.rbac.services import ensure_contract_keeps_admin

                ensure_contract_keeps_admin(current.contract_id, exclude_user_id=current.pk)
        current.delete(using=database, actor=actor)
    user.refresh_from_db(using=database)
    return user


@transaction.atomic
def login(*, request, username, password):
    user = authenticate(request=request, username=username, password=password)
    if user is None or not api_settings.USER_AUTHENTICATION_RULE(user):
        raise AuthenticationFailed()
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


@transaction.atomic
def refresh_tokens(*, refresh):
    try:
        token, user_public_id = _locked_refresh(refresh)
        user = get_user_model().objects.select_for_update().get(public_id=user_public_id, is_active=True)
        if not api_settings.USER_AUTHENTICATION_RULE(user):
            raise AuthenticationFailed()
        token.blacklist()
        token.set_jti()
        token.set_exp()
        token.set_iat()
        token.outstand()
        return {'access': str(token.access_token), 'refresh': str(token)}
    except TokenError, get_user_model().DoesNotExist:
        raise InvalidToken() from None


@transaction.atomic
def logout(*, refresh):
    try:
        token, _ = _locked_refresh(refresh)
        token.blacklist()
    except TokenError:
        raise InvalidToken() from None
