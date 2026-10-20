"""Settings de produção."""

from .base import *  # noqa: F403
from .base import MIDDLEWARE, STORAGES, env

DEBUG = False

ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS')
CSRF_TRUSTED_ORIGINS = env.list('DJANGO_CSRF_TRUSTED_ORIGINS', default=[])


# Static files servidos pelo WhiteNoise

MIDDLEWARE = [
    *MIDDLEWARE[:2],  # RequestIdMiddleware e SecurityMiddleware
    'whitenoise.middleware.WhiteNoiseMiddleware',
    *MIDDLEWARE[2:],
]

STORAGES = {
    **STORAGES,
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}


# HTTPS e cookies seguros (skills lgpd e crimes-ciberneticos)

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = env.bool('DJANGO_SECURE_SSL_REDIRECT', default=True)

CSRF_COOKIE_SECURE = True

SECURE_HSTS_SECONDS = env.int('DJANGO_SECURE_HSTS_SECONDS', default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
