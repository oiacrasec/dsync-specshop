from unittest import mock

import environ
import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import override_settings
from rest_framework.test import APIClient

from apps.core.storage import SignedFileSystemStorage
from config.storage import media_storage


def build(backend, **variables):
    with mock.patch.dict('os.environ', variables, clear=False):
        return media_storage(environ.Env(), backend=backend, media_root='/srv/media', url_expire=120)


def test_filesystem_is_the_signed_local_storage():
    assert build('filesystem') == {
        'BACKEND': 'apps.core.storage.SignedFileSystemStorage',
        'OPTIONS': {'location': '/srv/media'},
    }


def test_s3_is_private_with_presigned_urls_and_accepts_compatible_endpoints():
    options = build(
        's3',
        DJANGO_MEDIA_S3_BUCKET='datasync-media',
        DJANGO_MEDIA_S3_ENDPOINT_URL='http://minio:9000',
        DJANGO_MEDIA_S3_ADDRESSING_STYLE='path',
    )['OPTIONS']
    assert options['bucket_name'] == 'datasync-media' and options['endpoint_url'] == 'http://minio:9000'
    assert options['default_acl'] is None and options['querystring_auth'] is True
    assert options['querystring_expire'] == 120 and options['file_overwrite'] is False
    assert options['location'] == 'media' and options['access_key'] is None


def test_s3_without_bucket_and_unknown_backend_fail_at_startup():
    with mock.patch.dict('os.environ', {}, clear=True), pytest.raises(ImproperlyConfigured):
        media_storage(environ.Env(), backend='s3', media_root='/srv/media', url_expire=120)
    with pytest.raises(ImproperlyConfigured):
        build('ftp')


@pytest.fixture
def local_media(tmp_path):
    storages = {
        'default': {'BACKEND': 'apps.core.storage.SignedFileSystemStorage', 'OPTIONS': {'location': str(tmp_path)}},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
    with override_settings(STORAGES=storages, MEDIA_URL_EXPIRE=60):
        name = default_storage.save('avatars/maria.webp', ContentFile(b'RIFF-image-bytes'))
        yield name


@pytest.mark.django_db
def test_signed_url_serves_the_private_file_without_jwt(local_media):
    url = default_storage.url(local_media)
    assert url.startswith('/api/v1/media/') and 'avatars' not in url
    response = APIClient().get(url)
    assert response.status_code == 200
    assert b''.join(response.streaming_content) == b'RIFF-image-bytes'
    assert response['Content-Type'] == 'image/webp'
    assert response['Cache-Control'] == 'private, max-age=60'
    assert 'sandbox' in response['Content-Security-Policy']


@pytest.mark.django_db
def test_tampered_expired_or_missing_files_answer_404(local_media):
    url = default_storage.url(local_media)
    assert APIClient().get(url[:-3] + 'xx/').status_code == 404
    with mock.patch('django.core.signing.time.time', return_value=10**10):
        assert APIClient().get(url).status_code == 404
    default_storage.delete(local_media)
    assert APIClient().get(url).status_code == 404


@pytest.mark.django_db
def test_signed_route_is_inert_in_s3_mode(local_media):
    url = default_storage.url(local_media)
    s3 = {
        'default': {'BACKEND': 'storages.backends.s3.S3Storage', 'OPTIONS': {'bucket_name': 'b'}},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
    with override_settings(STORAGES=s3):
        assert not isinstance(default_storage, SignedFileSystemStorage)
        assert APIClient().get(url).status_code == 404
