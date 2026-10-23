"""Fachada única de mídia (ADR 0039): o projeto só lida com arquivos por aqui.

Models usam `MediaFileField` / `MediaImageField`; o resto do código usa as funções abaixo.
Nunca `models.FileField`, `models.ImageField`, `default_storage` ou `storages` direto (um
teste trava). Trocar o mecanismo de armazenamento = mudar só este módulo.

    avatar = MediaImageField(folder='avatars', max_size=2 * MB, square=256)
    user.avatar.url          # link assinado (filesystem) ou pre-signed (S3)
    name = media.save(arquivo, contract=contrato, folder='relatorios', allowed=(PDF,), max_size=10 * MB)

Todo nome segue `<public_id do contrato | system>/<pasta>/<uuid7>.<ext>` (decisão 81).
"""

import io
import uuid

import environ
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import models, transaction
from django.db.models.signals import post_delete, post_init, post_save
from django.utils.deconstruct import deconstructible
from django.utils.module_loading import import_string
from django.utils.translation import gettext_lazy as _
from PIL import Image, ImageOps

from config.storage import media_storage

from .storage import SignedFileSystemStorage, transfer_media

KB = 1024
MB = 1024 * KB
JPEG, PNG, WEBP, PDF = 'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
IMAGE_TYPES = (JPEG, PNG, WEBP)
EXTENSIONS = {JPEG: '.jpg', PNG: '.png', WEBP: '.webp', PDF: '.pdf'}
MAX_IMAGE_PIXELS = 40_000_000
SYSTEM_FOLDER = 'system'
WEBP_QUALITY = 85


def get_storage():
    """Único ponto que resolve o storage.

    Devolve o proxy preguiçoso do Django (resolve `STORAGES['default']` no uso e é reiniciado quando
    a configuração muda). O campo do Django chama esta função uma vez, ao carregar o model: com o
    proxy, ele nunca fica preso a uma instância.
    """
    return default_storage


def is_signed_local():
    return isinstance(get_storage(), SignedFileSystemStorage)


def url(name):
    return get_storage().url(name) if name else ''


def open_file(name, mode='rb'):
    return get_storage().open(name, mode)


def exists(name):
    return bool(name) and get_storage().exists(name)


def delete(name):
    """Tolera nome vazio ou arquivo já removido."""
    if exists(name):
        get_storage().delete(name)


def delete_on_commit(name):
    """Apaga só depois do commit: se a transação falhar, o arquivo continua."""
    if name:
        transaction.on_commit(lambda: delete(name))


def detect_content_type(file):
    """Tipo pelo conteúdo (assinatura), nunca pela extensão ou pelo que o cliente informou."""
    file.seek(0)
    head = file.read(16)
    file.seek(0)
    if head.startswith(b'\xff\xd8\xff'):
        return JPEG
    if head.startswith(b'\x89PNG\r\n\x1a\n'):
        return PNG
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return WEBP
    if head.startswith(b'%PDF-'):
        return PDF
    return None


def validate_upload(file, *, allowed, max_size):
    if file.size > max_size:
        raise ValidationError(_('Arquivo maior que o permitido (%(limit)s KB).'), params={'limit': max_size // KB})
    content_type = detect_content_type(file)
    if content_type not in allowed:
        raise ValidationError(_('Tipo de arquivo não permitido.'))
    if content_type in IMAGE_TYPES:
        try:
            with Image.open(file) as image:
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise ValidationError(_('Imagem grande demais.'))
                image.verify()
        except ValidationError:
            raise
        except Exception:
            raise ValidationError(_('Imagem inválida.')) from None
        finally:
            file.seek(0)
    return content_type


def prepare_upload(file, content_type, *, square=None, max_side=None):
    """Imagens são sempre regravadas em WebP: tira metadados (EXIF/GPS) e conteúdo embutido."""
    if content_type not in IMAGE_TYPES:
        file.seek(0)
        return ContentFile(file.read()), content_type
    with Image.open(file) as source:
        image = ImageOps.exif_transpose(source)
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
        if square:
            image = ImageOps.fit(image, (square, square), Image.Resampling.LANCZOS)
        elif max_side:
            image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, 'WEBP', quality=WEBP_QUALITY)
    file.seek(0)
    return ContentFile(output.getvalue()), WEBP


def owner_folder(contract):
    """Primeira pasta de todo arquivo: public_id do contrato dono, ou `system` (decisão 81).

    Separar um cliente (outro banco ou outra instalação) leva a pasta inteira; o public_id não
    muda entre bancos e não expõe o id interno nos links (ADR 0007).
    """
    if contract is None:
        return SYSTEM_FOLDER
    return str(getattr(contract, 'public_id', contract))


def contract_of(instance):
    """Contrato dono de um registro: o próprio contrato, o `contract` do registro ou nenhum."""
    from apps.contracts.models import Contract

    if isinstance(instance, Contract):
        return instance.public_id
    contract_id = getattr(instance, 'contract_id', None)
    if contract_id is None:
        return None
    return Contract.objects.unscoped().filter(pk=contract_id).values_list('public_id', flat=True).first()


def new_name(contract, folder, extension):
    return f'{owner_folder(contract)}/{folder}/{uuid.uuid7().hex}{extension}'


def save(file, *, contract, folder, allowed=IMAGE_TYPES, max_size=2 * MB, square=None, max_side=None):
    """Valida, prepara e grava fora de models; devolve o nome relativo (o que se guarda).

    `contract`: contrato dono (instância ou public_id) ou None para arquivos da plataforma.
    """
    content_type = validate_upload(file, allowed=allowed, max_size=max_size)
    content, content_type = prepare_upload(file, content_type, square=square, max_side=max_side)
    return get_storage().save(new_name(contract, folder, EXTENSIONS[content_type]), content)


def build_storage(backend):
    """Storage de um modo lido do .env, para migrar entre eles (`transfer_media`)."""
    config = media_storage(
        environ.Env(), backend=backend, media_root=settings.MEDIA_ROOT, url_expire=settings.MEDIA_URL_EXPIRE
    )
    return import_string(config['BACKEND'])(**config['OPTIONS'])


def transfer(source_backend, target_backend, *, dry_run=False):
    return transfer_media(build_storage(source_backend), build_storage(target_backend), dry_run=dry_run)


@deconstructible
class MediaUploadTo:
    """Contrato dono + pasta + UUID v7; a extensão vem do tipo detectado (nunca o nome original)."""

    def __init__(self, folder):
        self.folder = folder

    def __call__(self, instance, filename):
        extension = filename[filename.rfind('.') :] if '.' in filename else ''
        return new_name(contract_of(instance), self.folder, extension)

    def __eq__(self, other):
        return isinstance(other, MediaUploadTo) and other.folder == self.folder


@deconstructible
class MediaValidator:
    """Tamanho e tipo pelo conteúdo; vale no full_clean e nos serializers do DRF."""

    def __init__(self, allowed, max_size):
        self.allowed = tuple(allowed)
        self.max_size = max_size

    def __call__(self, value):
        if value and not getattr(value, '_committed', True):
            validate_upload(value.file, allowed=self.allowed, max_size=self.max_size)

    def __eq__(self, other):
        return isinstance(other, MediaValidator) and (other.allowed, other.max_size) == (self.allowed, self.max_size)


class MediaFieldMixin:
    """Campo do Django com storage da fachada, nome UUID, validação, preparo e limpeza.

    Limpeza: ao trocar o arquivo ou excluir o registro (delete real), o arquivo antigo é apagado
    depois do commit. `QuerySet.update/delete` e soft delete não disparam: o service do domínio
    chama `media.delete_on_commit` nesses casos.
    """

    default_allowed = IMAGE_TYPES

    def __init__(self, *args, folder, allowed=None, max_size=2 * MB, square=None, max_side=None, **kwargs):
        self.media_folder = folder
        self.media_allowed = tuple(allowed or self.default_allowed)
        self.media_max_size = max_size
        self.media_square = square
        self.media_max_side = max_side
        kwargs['storage'] = get_storage
        kwargs['upload_to'] = MediaUploadTo(folder)
        kwargs['validators'] = [*kwargs.get('validators', ()), MediaValidator(self.media_allowed, max_size)]
        kwargs.setdefault('max_length', 255)
        kwargs.setdefault('blank', True)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, _path, args, kwargs = super().deconstruct()
        for key in ('storage', 'upload_to', 'validators'):
            kwargs.pop(key, None)
        kwargs.update(folder=self.media_folder, max_size=self.media_max_size)
        if self.media_allowed != tuple(self.default_allowed):
            kwargs['allowed'] = self.media_allowed
        for key, value in (('square', self.media_square), ('max_side', self.media_max_side)):
            if value:
                kwargs[key] = value
        return name, f'{type(self).__module__}.{type(self).__name__}', args, kwargs

    def pre_save(self, model_instance, add):
        file = getattr(model_instance, self.attname)
        if file and not file._committed:
            content_type = validate_upload(file.file, allowed=self.media_allowed, max_size=self.media_max_size)
            content, content_type = prepare_upload(
                file.file, content_type, square=self.media_square, max_side=self.media_max_side
            )
            file.save(f'upload{EXTENSIONS[content_type]}', content, save=False)
        return file

    def contribute_to_class(self, cls, name, *args, **kwargs):
        super().contribute_to_class(cls, name, *args, **kwargs)
        if cls._meta.abstract:
            return
        uid = f'media:{cls._meta.label}.{name}'
        post_init.connect(self._remember, sender=cls, weak=False, dispatch_uid=f'{uid}:init')
        post_save.connect(self._cleanup_replaced, sender=cls, weak=False, dispatch_uid=f'{uid}:save')
        post_delete.connect(self._cleanup_deleted, sender=cls, weak=False, dispatch_uid=f'{uid}:delete')

    def _stored_name(self, instance):
        value = instance.__dict__.get(self.attname)
        return getattr(value, 'name', value) or ''

    def _remember(self, sender, instance, **kwargs):
        if self.attname in instance.__dict__:  # Campo adiado: não consulta o banco só para isso.
            instance.__dict__.setdefault('_media_names', {})[self.attname] = self._stored_name(instance)

    def _cleanup_replaced(self, sender, instance, **kwargs):
        names = instance.__dict__.setdefault('_media_names', {})
        current = self._stored_name(instance)
        previous = names.get(self.attname)
        if previous and previous != current:
            delete_on_commit(previous)
        names[self.attname] = current

    def _cleanup_deleted(self, sender, instance, **kwargs):
        delete_on_commit(self._stored_name(instance))


class MediaFileField(MediaFieldMixin, models.FileField):
    default_allowed = (PDF,)


class MediaImageField(MediaFieldMixin, models.ImageField):
    default_allowed = IMAGE_TYPES
