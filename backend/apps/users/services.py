import secrets
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import UUID

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import router, transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import AuthenticationFailed, Throttled
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.contracts.models import Contract
from apps.core import media
from apps.core.exceptions import ContractInactive, LicenseLimitReached
from apps.core.managers import SoftDeleteQuerySet
from apps.core.tenancy import system_scope

from .constants import RULE_FIELDS, SESSION_CLAIM


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
        if count and current.avatar:
            # Soft delete não dispara a limpeza do campo: a foto (dado pessoal) sai junto.
            media.delete_on_commit(current.avatar.name)
            base.update(avatar='')
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
    # Serializa login e alterações de credencial; não refaz Argon2 sob lock.
    try:
        current = _lock_mfa_user(user.pk, include_mfa=True)
    except get_user_model().DoesNotExist:
        raise AuthenticationFailed() from None
    if not constant_time_compare(current.password, user.password) or not api_settings.USER_AUTHENTICATION_RULE(current):
        raise AuthenticationFailed()
    ensure_contract_available(current)
    challenge = _mfa_challenge(current)
    if challenge is not None:
        return challenge
    return _issue_login_tokens(current, request)


def _issue_login_tokens(user, request):
    request.user = user  # Só autenticação completa entra no registro de sucesso (ADR 0019).
    refresh = RefreshToken.for_user(user)
    _start_session(user, refresh, request)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _client_ip(request):
    from apps.audit.utils import client_address

    return client_address(request)[0] if request is not None else '0.0.0.0'  # noqa: S104 — origem desconhecida.


def _expires_at(token):
    return datetime.fromtimestamp(token['exp'], tz=UTC)


def _start_session(user, refresh, request):
    """Abre a sessão do login e grava o id no token (o access herda a claim)."""
    from .devices import UserAgent
    from .models import UserSession

    now = timezone.now()
    UserSession.objects.filter(user=user, expires_at__lte=now).delete()  # Expiradas saem (LGPD).
    session = UserSession.objects.create(
        user=user,
        refresh_jti=refresh[api_settings.JTI_CLAIM],
        device=UserAgent.from_request(request).label,
        ip=_client_ip(request),
        last_seen_at=now,
        expires_at=_expires_at(refresh),
    )
    refresh[SESSION_CLAIM] = str(session.public_id)
    return session


def _decode_refresh(raw_token):
    """Valida assinatura/validade, sem tocar no banco."""
    try:
        token = RefreshToken(raw_token)
        public_id = UUID(token.get(api_settings.USER_ID_CLAIM))
    except TokenError, KeyError, ValueError, TypeError, AttributeError:
        raise InvalidToken() from None
    return token, public_id


def _lock_session(token, user):
    """Sessão do token, travada; encerrada → token inválido. Sem claim (token antigo) → None."""
    from .models import UserSession

    session_id = token.get(SESSION_CLAIM)
    if session_id is None:
        return None
    session = UserSession.objects.select_for_update().filter(public_id=session_id, user=user).first()
    if session is None:
        raise InvalidToken()
    return session


def _lock_outstanding(token):
    """Chamado dentro de atomic; serializa rotação e logout pelo jti."""
    try:
        OutstandingToken.objects.select_for_update().get(jti=token[api_settings.JTI_CLAIM])
        # Outro processo pode ter revogado o token enquanto aguardávamos o lock.
        token.check_blacklist()
    except OutstandingToken.DoesNotExist, TokenError:
        raise InvalidToken() from None


@system_scope  # Autenticação: antes do contexto; o SimpleJWT consulta User.objects.
@transaction.atomic
def refresh_tokens(*, refresh, request=None):
    try:
        token, user_public_id = _decode_refresh(refresh)
        # Ordem de locks usuário → token, a mesma do reset de senha (revoga todos os refresh).
        user = (
            get_user_model()
            .objects.unscoped()
            .select_related('contract')
            .select_for_update(of=('self',))  # Trava só o usuário; o contrato vem na mesma query.
            .get(public_id=user_public_id, is_active=True)
        )
        _lock_outstanding(token)
        if not api_settings.USER_AUTHENTICATION_RULE(user):
            raise AuthenticationFailed()
        ensure_contract_available(user)
        session = _lock_session(token, user)  # Ordem de locks: usuário → token → sessão.
        token.blacklist()
        token.set_jti()
        token.set_exp()
        token.set_iat()
        if session is None:
            _start_session(user, token, request)  # Token anterior às sessões (9.3).
        else:
            session.refresh_jti = token[api_settings.JTI_CLAIM]
            session.last_seen_at = timezone.now()
            session.expires_at = _expires_at(token)
            session.ip = _client_ip(request) if request is not None else session.ip
            session.save(update_fields=['refresh_jti', 'last_seen_at', 'expires_at', 'ip'])
        token.outstand()
        if request is not None:
            request.user = user
        return {'access': str(token.access_token), 'refresh': str(token)}
    except TokenError, get_user_model().DoesNotExist:
        raise InvalidToken() from None


@system_scope  # Autenticação: antes do contexto; o SimpleJWT consulta User.objects.
@transaction.atomic
def logout(*, refresh):
    try:
        token, _ = _decode_refresh(refresh)
        _lock_outstanding(token)
        token.blacklist()
        _delete_session(token.get(SESSION_CLAIM))
    except TokenError:
        raise InvalidToken() from None


def _delete_session(session_id):
    from .models import UserSession

    if session_id:
        UserSession.objects.filter(public_id=session_id).delete()


@system_scope
@transaction.atomic
def change_password(*, user, current_password, new_password):
    """Troca a própria senha com estado fresco e lock apenas na conta autenticada.

    Revalida a senha sob lock: duas trocas concorrentes não podem aceitar a mesma
    senha antiga. Não toca contratos, atribuições ou a blacklist de tokens.
    """
    try:
        current = (
            get_user_model()
            .objects.unscoped()
            .select_related('contract')
            .select_for_update(of=('self',))
            .get(pk=user.pk, is_active=True)
        )
    except get_user_model().DoesNotExist:
        raise AuthenticationFailed() from None
    ensure_contract_available(current)
    if not current.check_password(current_password):
        raise ValidationError({'current_password': _('Senha atual inválida.')})
    if current_password == new_password:
        raise ValidationError({'new_password': _('A nova senha deve ser diferente da senha atual.')})
    try:
        validate_password(new_password, user=current)
    except ValidationError as exc:
        raise ValidationError({'new_password': exc.messages}) from None

    from apps.audit.models import AuditEventType
    from apps.audit.services import record

    before = {'must_change_password': current.must_change_password}
    current.set_password(new_password)
    current.must_change_password = False
    current.save(actor=current, update_fields=['password', 'must_change_password'])
    record(
        AuditEventType.USER_PASSWORD_CHANGED,
        actor=current,
        contract_id=current.contract_id,
        target=current,
        before=before,
        after={'must_change_password': False},
    )
    return current


def _revoke_refresh_tokens(user):
    """Revoga todos os refresh pendentes da conta. Exige o lock do usuário (ordem usuário → token)."""
    pending = OutstandingToken.objects.filter(
        user_id=user.pk, blacklistedtoken__isnull=True, expires_at__gt=timezone.now()
    ).values_list('pk', flat=True)
    BlacklistedToken.objects.bulk_create([BlacklistedToken(token_id=pk) for pk in pending], ignore_conflicts=True)
    from .models import UserSession

    UserSession.objects.filter(user_id=user.pk).delete()


@system_scope
@transaction.atomic
def end_sessions(*, user, session_ids=None, keep=None):
    """Encerra sessões da própria conta: as informadas, ou todas menos `keep` (a atual).

    Revoga o refresh de cada uma (o dispositivo perde o acesso na próxima renovação, até a
    validade do access) e apaga a sessão. Ordem de locks usuário → token → sessão.
    """
    from .models import UserSession

    get_user_model().objects.unscoped().select_for_update(of=('self',)).get(pk=user.pk)
    sessions = UserSession.objects.select_for_update().filter(user_id=user.pk)
    if session_ids is not None:
        sessions = sessions.filter(public_id__in=session_ids)
    if keep is not None:
        sessions = sessions.exclude(public_id=keep)
    if session_ids is None:
        # Todas menos a mantida: revoga todo refresh pendente da conta, inclusive os sem sessão
        # (emitidos antes da 9.3), que de outro modo ganhariam sessão nova ao renovar.
        kept = UserSession.objects.filter(user_id=user.pk, public_id=keep).values_list('refresh_jti', flat=True)
        pending = OutstandingToken.objects.filter(
            user_id=user.pk, blacklistedtoken__isnull=True, expires_at__gt=timezone.now()
        ).exclude(jti__in=list(kept))
    else:
        jtis = list(sessions.values_list('refresh_jti', flat=True))
        pending = OutstandingToken.objects.filter(jti__in=jtis, blacklistedtoken__isnull=True)
    pending = pending.values_list('pk', flat=True)
    BlacklistedToken.objects.bulk_create([BlacklistedToken(token_id=pk) for pk in pending], ignore_conflicts=True)
    count, _ = sessions.delete()
    return count


@system_scope
@transaction.atomic
def reset_password(*, user, actor):
    """Senha temporária nova + troca obrigatória + revogação dos refresh (decisão 40).

    Só usuário comum não excluído; a autorização fica com quem chama. A senha volta
    uma única vez ao chamador; o evento guarda só a flag. Access já emitido expira
    sozinho, mas a flag bloqueia a navegação desde já (ADR 0034).
    """
    current = (
        get_user_model()
        .objects.unscoped()
        .select_for_update(of=('self',))
        .get(pk=user.pk, deleted_at__isnull=True, is_superuser=False)
    )
    from apps.audit.models import AuditEventType
    from apps.audit.services import record

    from .utils import generate_temporary_password

    before = {'must_change_password': current.must_change_password}
    temporary_password = generate_temporary_password(current)
    current.set_password(temporary_password)
    current.must_change_password = True
    current.save(actor=actor, update_fields=['password', 'must_change_password'])
    _revoke_refresh_tokens(current)
    record(
        AuditEventType.USER_PASSWORD_RESET,
        actor=actor,
        contract_id=current.contract_id,
        target=current,
        before=before,
        after={'must_change_password': True},
    )
    return current, temporary_password


def _mfa_challenge(user):
    """Só o hash da prova da senha vai ao banco, com cinco minutos e uso único."""
    from .constants import MFA_CHALLENGE_SECONDS, MFA_MAX_LOGIN_CHALLENGES
    from .models import UserMfa, UserMfaChallenge

    try:
        device = user.mfa
    except UserMfa.DoesNotExist:
        return None
    if not device.confirmed:
        return None
    now = timezone.now()
    UserMfaChallenge.objects.filter(user=user, expires_at__lte=now).delete()
    # Limita armazenamento por conta; o lock do usuário serializa emissões concorrentes.
    stale = list(
        UserMfaChallenge.objects.filter(user=user)
        .order_by('-pk')
        .values_list('pk', flat=True)[MFA_MAX_LOGIN_CHALLENGES - 1 :]
    )
    if stale:
        UserMfaChallenge.objects.filter(pk__in=stale).delete()
    token = secrets.token_urlsafe(32)
    UserMfaChallenge.objects.create(
        user=user,
        digest=sha256(token.encode()).hexdigest(),
        generation=device.generation,
        password_digest=user.get_session_auth_hash(),
        expires_at=now + timedelta(seconds=MFA_CHALLENGE_SECONDS),
    )
    return {'mfa_required': True, 'mfa_token': token, 'expires_in': MFA_CHALLENGE_SECONDS}


def _lock_mfa_user(pk, *, include_mfa=False):
    queryset = get_user_model().objects.unscoped().select_related('contract')
    if include_mfa:
        queryset = queryset.select_related('mfa')
    user = queryset.select_for_update(of=('self',)).get(pk=pk, is_active=True)
    if not api_settings.USER_AUTHENTICATION_RULE(user):
        raise AuthenticationFailed()
    ensure_contract_available(user)
    return user


@system_scope
def login_mfa(*, request, mfa_token, code):
    from .constants import MFA_MAX_LOGIN_FAILURES
    from .mfa import Mfa, MfaChallengesRevoked
    from .models import UserMfa, UserMfaChallenge

    digest = sha256(mfa_token.encode()).hexdigest()
    owner = (
        UserMfaChallenge.objects.filter(digest=digest, expires_at__gt=timezone.now())
        .values_list('user_id', flat=True)
        .first()
    )
    if owner is None:
        raise AuthenticationFailed()
    error = None
    with transaction.atomic():
        try:
            user = _lock_mfa_user(owner)
        except get_user_model().DoesNotExist:
            raise AuthenticationFailed() from None
        challenge = (
            UserMfaChallenge.objects.select_for_update()
            .filter(digest=digest, user=user, expires_at__gt=timezone.now())
            .first()
        )
        device = UserMfa.objects.select_for_update().filter(user=user, confirmed=True).first()
        if (
            challenge is None
            or device is None
            or challenge.generation != device.generation
            or not constant_time_compare(challenge.password_digest, user.get_session_auth_hash())
        ):
            raise AuthenticationFailed()
        error = Mfa(device).verify(code, allow_recovery=True)
        if error is None:
            challenge.delete()
            result = _issue_login_tokens(user, request)
        elif not isinstance(error, Throttled) and device.failures >= MFA_MAX_LOGIN_FAILURES:
            UserMfaChallenge.objects.filter(user=user).delete()
            error = MfaChallengesRevoked(user.get_username())
    # A view é non_atomic_requests: o contador de falhas já está confirmado aqui.
    if error:
        raise error
    return result


@system_scope
@transaction.atomic
def setup_mfa(*, user):
    from uuid import uuid4

    import pyotp

    from apps.core.exceptions import MfaStateConflict

    from .constants import MFA_CHALLENGE_SECONDS
    from .mfa import Mfa
    from .models import UserMfa

    current = _lock_mfa_user(user.pk)
    device, _ = UserMfa.objects.select_for_update().get_or_create(user=current)
    if device.confirmed:
        raise MfaStateConflict()
    device.secret = Mfa.encrypt(pyotp.random_base32())
    device.generation = uuid4()
    device.last_t = -1
    device.setup_expires_at = timezone.now() + timedelta(seconds=MFA_CHALLENGE_SECONDS)
    # Não zera falhas ao reiniciar: setup não pode contornar a espera crescente.
    device.save(update_fields=['secret', 'generation', 'last_t', 'setup_expires_at'])
    return Mfa(device).provisioning(current.username)


@system_scope
def change_mfa(*, user, operation, code, password=None):
    """Confirma o fator e encerra sessões; falhas confirmam o contador antes do erro HTTP."""
    from apps.audit.models import AuditEventType as Event
    from apps.core.exceptions import MfaStateConflict

    from .mfa import Mfa
    from .models import UserMfa

    events = {
        'enable': Event.USER_MFA_ENABLED,
        'disable': Event.USER_MFA_DISABLED,
        'regenerate': Event.USER_MFA_RECOVERY_REGENERATED,
    }
    event = events[operation]
    result = None
    with transaction.atomic():
        try:
            current = _lock_mfa_user(user.pk)
        except get_user_model().DoesNotExist:
            raise AuthenticationFailed() from None
        device = UserMfa.objects.select_for_update().filter(user=current).first()
        if (
            device is None
            or (
                operation == 'enable'
                and (device.confirmed or not device.setup_expires_at or device.setup_expires_at <= timezone.now())
            )
            or (operation != 'enable' and not device.confirmed)
        ):
            raise MfaStateConflict()
        factor = Mfa(device)
        # Ativar e desativar pedem a senha (sessão roubada não troca o fator); a espera
        # também limita essas tentativas, antes do hash caro.
        from rest_framework.exceptions import Throttled

        wait = factor.retry_after()
        if wait:
            error = Throttled(wait=wait)
        elif operation in ('enable', 'disable') and not current.check_password(password or ''):
            error = factor.failure(field='password')
        else:
            error = factor.verify(code, allow_recovery=operation != 'enable')
        if error is None:
            before = device.confirmed
            if operation == 'disable':
                _clear_mfa(device)
            else:
                device.confirmed = True
                device.setup_expires_at = None
                result = {'recovery_codes': factor.new_recovery_codes()}
            _finish_mfa_change(current, device, actor=current, event=event, before=before)
    if error:
        raise error
    return result


def _clear_mfa(device):
    device.confirmed = False
    device.secret = ''
    device.last_t = -1
    device.failures = 0
    device.last_failure_at = None
    device.setup_expires_at = None
    device.recovery_codes.all().delete()


def _finish_mfa_change(user, device, *, actor, event, before):
    from uuid import uuid4

    from apps.audit.services import record

    from .models import UserMfaChallenge

    device.generation = uuid4()
    device.save()
    UserMfaChallenge.objects.filter(user=user).delete()
    _revoke_refresh_tokens(user)
    record(
        event,
        actor=actor,
        contract_id=user.contract_id,
        target=user,
        before={'mfa_enabled': before},
        after={'mfa_enabled': device.confirmed},
    )


@system_scope
@transaction.atomic
def reset_mfa(*, user, actor, allow_superadmin=False):
    """Recuperação administrativa; serializa com alterações de papéis e da própria conta."""
    from rest_framework.exceptions import NotFound, PermissionDenied

    from apps.audit.models import AuditEventType
    from apps.rbac.selectors import contract_admin_users
    from apps.rbac.services import begin_write

    from .models import UserMfa

    begin_write(actor, contract_id=user.contract_id)
    # A mesma ordem entre duas contas evita deadlock em resets concorrentes.
    accounts = {
        account.pk: account
        for account in get_user_model()
        .objects.unscoped()
        .select_for_update()
        .filter(
            pk__in=[actor.pk, user.pk],
        )
        .order_by('pk')
    }
    current_actor = accounts.get(actor.pk)
    current = accounts.get(user.pk)
    if current is None:
        raise NotFound()
    if current_actor is None or not current_actor.is_active:
        raise PermissionDenied()
    # O papel de admin permanece mesmo com a conta inativa (decisão 43).
    target_is_admin = (
        current.contract_id is not None and contract_admin_users(current.contract_id).filter(pk=current.pk).exists()
    )
    if current.is_superuser:
        permitted = allow_superadmin and current_actor.is_superuser
    elif current_actor.is_superuser:
        permitted = target_is_admin
    else:
        permitted = (
            current_actor.pk != current.pk
            and current_actor.contract_id == current.contract_id
            and contract_admin_users(current_actor.contract_id).filter(pk=current_actor.pk).exists()
            and not target_is_admin
        )
    if not permitted:
        raise PermissionDenied(_('A redefinição do MFA exige autorização administrativa.'))
    device, created = UserMfa.objects.select_for_update().get_or_create(user=current)
    before = device.confirmed
    _clear_mfa(device)
    _finish_mfa_change(current, device, actor=current_actor, event=AuditEventType.USER_MFA_RESET, before=before)
