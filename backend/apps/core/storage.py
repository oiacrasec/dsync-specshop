"""Mídia no sistema de arquivos com URL temporária assinada (ADR 0039).

A pasta não é servida diretamente: `url()` devolve `/api/v1/media/<token>/`, e o token assinado
(nome do arquivo + horário) é a credencial, válida por `MEDIA_URL_EXPIRE` segundos.
"""

from django.conf import settings
from django.core import signing
from django.core.files.storage import FileSystemStorage
from django.urls import reverse

MEDIA_SIGNING_SALT = 'datasync.media'


class SignedFileSystemStorage(FileSystemStorage):
    def url(self, name):
        token = signing.dumps(name, salt=MEDIA_SIGNING_SALT)
        return reverse('media-file', kwargs={'token': token})


def media_name_from_token(token):
    """Nome do arquivo do token válido e não expirado; None se adulterado ou vencido."""
    try:
        return signing.loads(token, salt=MEDIA_SIGNING_SALT, max_age=settings.MEDIA_URL_EXPIRE)
    except signing.BadSignature:
        return None
