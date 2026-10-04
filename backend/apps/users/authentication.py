from uuid import UUID

from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.authentication import JWTAuthentication as SimpleJWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.utils import get_md5_hash_password


class JWTAuthentication(SimpleJWTAuthentication):
    """Mesma regra do SimpleJWT, com o contrato na mesma query e conferido a cada requisição.

    Contrato indisponível → 403 contract-inactive (ADR 0006 §3); o cliente encerra a sessão.
    """

    def get_user(self, validated_token):
        try:
            public_id = UUID(validated_token.get(api_settings.USER_ID_CLAIM))
        except ValueError, TypeError, AttributeError:
            raise InvalidToken() from None
        try:
            # Autenticação vem antes do contexto: busca global explícita.
            user = (
                self.user_model.objects.unscoped()
                .select_related('contract')
                .get(**{api_settings.USER_ID_FIELD: public_id})
            )
        except self.user_model.DoesNotExist:
            raise AuthenticationFailed(_('User not found'), code='user_not_found') from None
        if api_settings.CHECK_USER_IS_ACTIVE and not user.is_active:
            raise AuthenticationFailed(_('User is inactive'), code='user_inactive')
        if api_settings.CHECK_REVOKE_TOKEN and validated_token.get(
            api_settings.REVOKE_TOKEN_CLAIM
        ) != get_md5_hash_password(user.password):
            raise AuthenticationFailed(_("The user's password has been changed."), code='password_changed')
        from apps.users.services import ensure_contract_available

        ensure_contract_available(user)
        return user
