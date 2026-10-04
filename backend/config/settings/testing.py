"""Settings para a suíte de testes."""

from .base import *  # noqa: F403
from .base import env

SECRET_KEY = env('DJANGO_SECRET_KEY', default='insecure-testing-key')

# Hasher rápido: Argon2 deixaria os testes lentos.
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# App só de testes com um model de cada tipo de escopo (etapas 2.4 e 2.5); sem migrations.
INSTALLED_APPS = [*INSTALLED_APPS, 'apps.core.tests.scoping']  # noqa: F405
