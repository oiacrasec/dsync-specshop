"""Settings para a suíte de testes."""

from .base import *  # noqa: F403
from .base import env

SECRET_KEY = env('DJANGO_SECRET_KEY', default='insecure-testing-key')

# Hasher rápido: Argon2 deixaria os testes lentos.
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
