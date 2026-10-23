import io
import re
from pathlib import Path

import pytest
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.db import connection, models
from django.test import override_settings
from django.test.utils import isolate_apps
from PIL import Image

from apps.core import media

NAME = re.compile(r'^avatars/[0-9a-f]{32}\.webp$')


def image_bytes(fmt='PNG', size=(400, 300), exif=None):
    output = io.BytesIO()
    Image.new('RGB', size, (200, 30, 30)).save(output, fmt, **({'exif': exif} if exif else {}))
    return output.getvalue()


@pytest.fixture(autouse=True)
def local_media(tmp_path):
    storages = {
        'default': {'BACKEND': 'apps.core.storage.SignedFileSystemStorage', 'OPTIONS': {'location': str(tmp_path)}},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
    with override_settings(STORAGES=storages):
        yield tmp_path


def test_save_reencodes_images_to_webp_with_a_uuid_name_and_signed_url():
    name = media.save(ContentFile(image_bytes(), name='minha foto.png'), folder='avatars', square=256)
    assert NAME.match(name) and media.exists(name)
    with media.open_file(name) as stored, Image.open(stored) as image:
        assert image.format == 'WEBP' and image.size == (256, 256)
    assert media.url(name).startswith('/api/v1/media/')
    assert media.url('') == ''


def test_metadata_such_as_gps_is_dropped():
    exif = Image.Exif()
    exif[0x8825] = {1: 'S', 2: (23.0, 33.0, 0.0)}  # GPSInfo
    name = media.save(ContentFile(image_bytes('JPEG', exif=exif.tobytes())), folder='avatars')
    with media.open_file(name) as stored, Image.open(stored) as image:
        assert not image.getexif() and 'exif' not in image.info


@pytest.mark.parametrize(
    ('content', 'message'),
    [
        (b'<script>alert(1)</script>', 'Tipo de arquivo não permitido.'),
        (b'%PDF-1.7 disguised as png', 'Tipo de arquivo não permitido.'),
        (b'\x89PNG\r\n\x1a\n' + b'\x00' * 40, 'Imagem inválida.'),
    ],
)
def test_type_is_checked_by_content_not_by_name(content, message):
    with pytest.raises(ValidationError, match=message):
        media.save(ContentFile(content, name='foto.png'), folder='avatars')


def test_size_limit_and_tolerant_delete():
    with pytest.raises(ValidationError, match='maior que o permitido'):
        media.save(ContentFile(image_bytes(size=(800, 800))), folder='avatars', max_size=1 * media.KB)
    media.delete('')
    media.delete('avatars/ausente.webp')


def test_pdf_is_kept_as_is_when_allowed():
    name = media.save(ContentFile(b'%PDF-1.7 conteudo'), folder='docs', allowed=(media.PDF,), max_size=media.MB)
    assert name.endswith('.pdf') and media.open_file(name).read() == b'%PDF-1.7 conteudo'


@pytest.fixture
def photo_model(db):
    with isolate_apps('apps.core'):

        class Photo(models.Model):
            image = media.MediaImageField(folder='avatars', square=64)

            class Meta:
                app_label = 'core'

            def __str__(self):
                return self.image.name

        with connection.schema_editor() as editor:
            editor.create_model(Photo)
        yield Photo


def test_field_validates_prepares_and_cleans_old_files_after_commit(photo_model, django_capture_on_commit_callbacks):
    photo = photo_model(image=ContentFile(image_bytes(), name='original.png'))
    photo.full_clean()
    with django_capture_on_commit_callbacks(execute=True):
        photo.save()
    first = photo.image.name
    assert NAME.match(first) and photo.image.width == 64 and photo.image.url.startswith('/api/v1/media/')
    photo = photo_model.objects.get(pk=photo.pk)
    photo.image = ContentFile(image_bytes(size=(80, 90)), name='nova.jpg')
    with django_capture_on_commit_callbacks(execute=True):
        photo.save()
    assert media.exists(photo.image.name) and not media.exists(first)
    second = photo.image.name
    with django_capture_on_commit_callbacks(execute=False) as pending:
        photo.delete()
    assert media.exists(second) and len(pending) == 1  # Antes do commit o arquivo continua.
    pending[0]()
    assert not media.exists(second)


def test_field_rejects_bad_uploads_on_full_clean_and_on_save(photo_model):
    with pytest.raises(ValidationError):
        photo_model(image=ContentFile(b'texto', name='a.png')).full_clean()
    with pytest.raises(ValidationError):
        photo_model(image=ContentFile(b'texto', name='a.png')).save()


def test_field_deconstruct_keeps_migrations_stable(photo_model):
    _name, path, _args, kwargs = photo_model._meta.get_field('image').deconstruct()
    assert path == 'apps.core.media.MediaImageField'
    assert kwargs == {'folder': 'avatars', 'max_size': 2 * media.MB, 'square': 64, 'max_length': 255, 'blank': True}


FORBIDDEN = re.compile(
    r'models\.(FileField|ImageField)\(|default_storage|from django\.core\.files\.storage import|\bstorages\['
)
FACADE = {'apps/core/media.py', 'apps/core/storage.py'}


def test_nobody_uses_django_file_storage_directly():
    """Regra da fachada (ADR 0039): só apps/core/media.py (e o storage que ele usa) fala com o Django."""
    root = Path(settings.BASE_DIR)
    offenders = [
        str(path.relative_to(root))
        for folder in ('apps', 'config')
        for path in (root / folder).rglob('*.py')
        if '/tests/' not in str(path)
        and '/migrations/' not in str(path)
        and str(path.relative_to(root)) not in FACADE
        and FORBIDDEN.search(path.read_text())
    ]
    assert offenders == [], f'Use apps.core.media em vez do storage do Django: {offenders}'
