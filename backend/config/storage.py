"""Armazenamento de mídia escolhido pelo .env (ADR 0039): `filesystem` ou `s3`.

Nos dois modos os arquivos são privados e chegam ao navegador por URL temporária assinada.
"""

from django.core.exceptions import ImproperlyConfigured

MEDIA_BACKENDS = ('filesystem', 's3')


def media_storage(env, *, backend, media_root, url_expire):
    if backend == 'filesystem':
        return {'BACKEND': 'apps.core.storage.SignedFileSystemStorage', 'OPTIONS': {'location': str(media_root)}}
    if backend == 's3':
        return {
            'BACKEND': 'storages.backends.s3.S3Storage',
            'OPTIONS': {
                'bucket_name': env.str('DJANGO_MEDIA_S3_BUCKET'),
                'location': env.str('DJANGO_MEDIA_S3_PREFIX', default='media'),
                'region_name': env.str('DJANGO_MEDIA_S3_REGION', default=None),
                # Vazio = AWS; preenchido = MinIO ou outro serviço compatível.
                'endpoint_url': env.str('DJANGO_MEDIA_S3_ENDPOINT_URL', default=None),
                'addressing_style': env.str('DJANGO_MEDIA_S3_ADDRESSING_STYLE', default=None),
                # Sem chaves = credenciais do ambiente (perfil/IAM role).
                'access_key': env.str('DJANGO_MEDIA_S3_ACCESS_KEY_ID', default=None),
                'secret_key': env.str('DJANGO_MEDIA_S3_SECRET_ACCESS_KEY', default=None),
                'signature_version': 's3v4',
                'default_acl': None,
                'querystring_auth': True,
                'querystring_expire': url_expire,
                'file_overwrite': False,
            },
        }
    raise ImproperlyConfigured(f'DJANGO_MEDIA_STORAGE deve ser um de {", ".join(MEDIA_BACKENDS)}.')
