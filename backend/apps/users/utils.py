import secrets

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from .constants import TEMPORARY_PASSWORD_ALPHABET, TEMPORARY_PASSWORD_ATTEMPTS, TEMPORARY_PASSWORD_LENGTH


def generate_temporary_password(user):
    """Senha aleatória (CSPRNG) que passa nos validadores do Django para `user`."""
    for _ in range(TEMPORARY_PASSWORD_ATTEMPTS):
        candidate = ''.join(secrets.choice(TEMPORARY_PASSWORD_ALPHABET) for _ in range(TEMPORARY_PASSWORD_LENGTH))
        try:
            validate_password(candidate, user=user)
        except ValidationError:
            continue
        return candidate
    raise RuntimeError('Could not generate a valid temporary password.')
