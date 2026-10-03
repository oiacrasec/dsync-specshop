from uuid import UUID

from rest_framework_simplejwt.authentication import JWTAuthentication as SimpleJWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings


class JWTAuthentication(SimpleJWTAuthentication):
    def get_user(self, validated_token):
        try:
            UUID(validated_token.get(api_settings.USER_ID_CLAIM))
        except ValueError, TypeError, AttributeError:
            raise InvalidToken() from None
        return super().get_user(validated_token)
