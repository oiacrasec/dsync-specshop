"""Mídia no sistema de arquivos com URL temporária assinada (ADR 0039).

A pasta não é servida diretamente: `url()` devolve `/api/v1/media/<token>/`, e o token assinado
(nome do arquivo + horário) é a credencial, válida por `MEDIA_URL_EXPIRE` segundos.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

from django.conf import settings
from django.core import signing
from django.core.files.storage import FileSystemStorage
from django.urls import reverse

MEDIA_SIGNING_SALT = 'dsync.media'


class SignedFileSystemStorage(FileSystemStorage):
    def delete(self, name):
        """Apaga o arquivo e as pastas que ficarem vazias, até a raiz da mídia (que fica).

        No S3 não há pastas: o prefixo some sozinho com o último arquivo.
        """
        super().delete(name)
        root = Path(self.location).resolve()
        folder = Path(self.path(name)).parent
        while folder != root and root in folder.parents:
            try:
                os.rmdir(folder)  # Só remove pasta vazia; outra em uso falha e para aqui.
            except OSError:
                break
            folder = folder.parent

    def url(self, name):
        token = signing.dumps(name, salt=MEDIA_SIGNING_SALT)
        return reverse('media-file', kwargs={'token': token})


def media_name_from_token(token):
    """Nome do arquivo do token válido e não expirado; None se adulterado ou vencido."""
    try:
        return signing.loads(token, salt=MEDIA_SIGNING_SALT, max_age=settings.MEDIA_URL_EXPIRE)
    except signing.BadSignature:
        return None


@dataclass
class TransferReport:
    copied: list = field(default_factory=list)
    skipped: list = field(default_factory=list)
    failed: list = field(default_factory=list)


def walk(storage, path=''):
    """Nomes relativos de todos os arquivos (os mesmos que o banco guarda)."""
    directories, files = storage.listdir(path)
    for name in sorted(files):
        yield f'{path}/{name}' if path else name
    for directory in sorted(directories):
        yield from walk(storage, f'{path}/{directory}' if path else directory)


def transfer_media(source, target, *, dry_run=False):
    """Copia a mídia mantendo os nomes, para trocar de storage sem mexer no banco (ADR 0039).

    Incremental: pula o que já existe no destino com o mesmo tamanho. Nunca apaga a origem.
    """
    report = TransferReport()
    for name in walk(source):
        size = source.size(name)
        try:
            if target.exists(name) and target.size(name) == size:
                report.skipped.append(name)
                continue
            if not dry_run:
                if target.exists(name):
                    target.delete(name)  # Tamanho diferente: cópia anterior incompleta.
                with source.open(name, 'rb') as content:
                    saved = target.save(name, content)
                if saved != name or target.size(name) != size:
                    raise OSError('cópia divergente')
            report.copied.append(name)
        except Exception as exc:  # noqa: BLE001 — falha de um arquivo não interrompe os demais
            report.failed.append((name, str(exc)))
    return report
