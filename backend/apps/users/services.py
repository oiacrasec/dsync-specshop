from uuid import UUID

from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken


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
