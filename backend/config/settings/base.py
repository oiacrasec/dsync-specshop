"""
Settings comuns a todos os ambientes.

Valores sensíveis ou específicos de ambiente vêm de variáveis de ambiente
(ver backend/.env.example). Os módulos development, production e testing
estendem este arquivo.
"""

from datetime import timedelta
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured
from django.utils.crypto import constant_time_compare

from config.storage import media_storage

# backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('DJANGO_SECRET_KEY')

DEBUG = False

ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=[])


# Application definition

DJANGO_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'django_filters',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
]

LOCAL_APPS = [
    'apps.core',
    'apps.users',
    'apps.contracts',
    'apps.administration',
    'apps.rbac',
    'apps.audit',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'apps.core.middleware.RequestIdMiddleware',
    # Camada C: cada requisição começa sem contexto de tenant (ADR 0006 §1.3).
    'apps.core.middleware.TenantContextMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Fora da transação da view: a entrada do superadmin fica registrada mesmo com erro.
    'apps.audit.middleware.SuperadminEntryAuditMiddleware',
    # ADR 0019: só eventos de autenticação, fora da transação da view.
    'apps.audit.middleware.AccessLogMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'


# Database (PostgreSQL)

DATABASES = {
    'default': env.db('DATABASE_URL'),
}
DATABASES['default']['ATOMIC_REQUESTS'] = True


# Authentication

AUTH_USER_MODEL = 'users.User'

# Argon2 como hasher principal (skill lgpd: senhas com hash forte).
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.ScryptPasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 12},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# Datas são armazenadas em UTC (USE_TZ) e exibidas no fuso de Brasília
# (skill marco-civil: registros com horário confiável).

LANGUAGE_CODE = 'pt-br'

TIME_ZONE = 'America/Sao_Paulo'

USE_I18N = True

USE_TZ = True


# Static and media files

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = 'media/'
MEDIA_ROOT = env.path('DJANGO_MEDIA_ROOT', default=BASE_DIR / 'media')
MEDIA_STORAGE = env.str('DJANGO_MEDIA_STORAGE', default='filesystem')
# Validade das URLs assinadas de mídia, em segundos.
MEDIA_URL_EXPIRE = env.int('DJANGO_MEDIA_URL_EXPIRE', default=300)

STORAGES = {
    'default': media_storage(env, backend=MEDIA_STORAGE, media_root=MEDIA_ROOT, url_expire=MEDIA_URL_EXPIRE),
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Django REST Framework
# Seguro por padrão: toda rota exige autenticação, salvo quando liberada
# explicitamente na view.

REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'apps.core.problems.exception_handler',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.users.authentication.JWTAuthentication',
    ],
    # Nega por padrão: toda view declara required_permission ou AllowAuthenticated (ADR 0009 §4).
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
        'apps.rbac.permissions.RequiredPermission',
    ],
    'DEFAULT_SCHEMA_CLASS': 'apps.core.openapi.AutoSchema',
}

# OpenAPI gerado do código (ADR 0004); arquivo em docs/api/openapi-v1.yaml.
SPECTACULAR_SETTINGS = {
    'TITLE': 'datasync-core API',
    'DESCRIPTION': 'API v1. Erros em RFC 9457 (application/problem+json); contexto pelo header X-Organization-Id.',
    'VERSION': '1',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': r'/api/v1',
    'COMPONENT_SPLIT_REQUEST': True,
    'DEFAULT_GENERATOR_CLASS': 'apps.core.openapi.SchemaGenerator',
    'POSTPROCESSING_HOOKS': [
        'drf_spectacular.hooks.postprocess_schema_enums',
        'apps.core.openapi.add_problem_responses',
    ],
}

# Registro de acesso: headers do proxy reverso com IP e porta reais do cliente (ADR 0018).
# Vazios = conexão direta (desenvolvimento). Em produção, o check --deploy exige configurar.
ACCESS_LOG_CLIENT_IP_HEADER = env('DJANGO_ACCESS_LOG_IP_HEADER', default='')
ACCESS_LOG_CLIENT_PORT_HEADER = env('DJANGO_ACCESS_LOG_PORT_HEADER', default='')

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('DJANGO_JWT_SIGNING_KEY'),
    'USER_ID_FIELD': 'public_id',
    'USER_ID_CLAIM': 'public_id',
    'AUTH_HEADER_TYPES': ('Bearer',),
}

if len(SIMPLE_JWT['SIGNING_KEY'].encode('utf-8')) < 32 or constant_time_compare(SIMPLE_JWT['SIGNING_KEY'], SECRET_KEY):
    raise ImproperlyConfigured(
        'DJANGO_JWT_SIGNING_KEY deve ter pelo menos 32 bytes e ser independente de DJANGO_SECRET_KEY.'
    )

AUTH_LOGIN_RATE = env('DJANGO_AUTH_LOGIN_RATE', default='5/min')


# Security (comum a todos os ambientes)

CSRF_COOKIE_HTTPONLY = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'


# Logging
# Nunca registrar dados pessoais em claro (skill lgpd).

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'default': {
            'format': '{asctime} {levelname} {name} request_id={request_id} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'default',
            'filters': ['request_id'],
        },
    },
    'filters': {
        'request_id': {'()': 'apps.core.log_filters.RequestIdFilter'},
    },
    'root': {
        'handlers': ['console'],
        'level': env('DJANGO_LOG_LEVEL', default='INFO'),
    },
}
