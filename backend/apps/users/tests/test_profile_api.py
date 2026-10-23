import io

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APIClient

from apps.core import media

pytestmark = pytest.mark.django_db
URL = '/api/v1/me/profile/'


def png(size=(300, 200)):
    output = io.BytesIO()
    Image.new('RGB', size, (10, 120, 200)).save(output, 'PNG')
    return SimpleUploadedFile('eu.png', output.getvalue(), content_type='image/png')


@pytest.fixture(autouse=True)
def local_media(tmp_path):
    storages = {
        'default': {'BACKEND': 'apps.core.storage.SignedFileSystemStorage', 'OPTIONS': {'location': str(tmp_path)}},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
    with override_settings(STORAGES=storages):
        yield


@pytest.fixture
def maria(user_contract):
    return get_user_model().objects.create_user(username='maria', first_name='Maria', contract=user_contract)


def client(user):
    api = APIClient()
    api.force_authenticate(user)
    return api


def put(user, **data):
    payload = {'name': 'Maria Silva', 'time_zone': 'America/Sao_Paulo', **data}
    return client(user).put(URL, payload, format='multipart')


def test_get_shows_username_name_effective_time_zone_and_no_photo(maria):
    assert client(maria).get(URL).json() == {
        'username': 'maria',
        'name': 'Maria',
        'time_zone': 'America/Sao_Paulo',
        'avatar_url': '',
    }


def test_one_submit_saves_name_time_zone_and_photo(maria, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        response = put(maria, name='  Maria Silva ', time_zone='Europe/Lisbon', avatar=png())
    assert response.status_code == 200, response.content
    data = response.json()
    assert data['name'] == 'Maria Silva' and data['time_zone'] == 'Europe/Lisbon'
    assert data['avatar_url'].startswith('/api/v1/media/')
    maria.refresh_from_db()
    assert maria.avatar.name.startswith(f'{maria.contract.public_id}/avatars/') and maria.avatar.name.endswith('.webp')
    assert (maria.avatar.width, maria.avatar.height) == (256, 256)
    assert 'password' not in data


def test_system_time_zone_is_stored_as_blank_and_unknown_zone_is_rejected(maria):
    put(maria, time_zone='America/Sao_Paulo')
    maria.refresh_from_db()
    assert maria.time_zone == ''
    response = put(maria, time_zone='Marte/Olympus')
    assert response.status_code == 422 and 'time_zone' in response.json()['errors']


def test_replacing_and_removing_the_photo_deletes_old_files_after_commit(maria, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        put(maria, avatar=png())
    maria.refresh_from_db()
    first = maria.avatar.name
    with django_capture_on_commit_callbacks(execute=True):
        put(maria, avatar=png((90, 90)))
    maria.refresh_from_db()
    assert media.exists(maria.avatar.name) and not media.exists(first)
    second = maria.avatar.name
    with django_capture_on_commit_callbacks(execute=True):
        response = put(maria, remove_avatar='true')
    assert response.json()['avatar_url'] == '' and not media.exists(second)


def test_keeping_the_photo_when_only_text_changes(maria, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        put(maria, avatar=png())
    maria.refresh_from_db()
    with django_capture_on_commit_callbacks(execute=True):
        put(maria, name='Outra')
    assert media.exists(maria.avatar.name)
    maria.refresh_from_db()
    assert maria.first_name == 'Outra'


@pytest.mark.parametrize(
    'upload',
    [
        SimpleUploadedFile('eu.png', b'<svg onload=alert(1)>', content_type='image/png'),
        SimpleUploadedFile('eu.pdf', b'%PDF-1.7', content_type='application/pdf'),
    ],
)
def test_invalid_uploads_are_rejected_on_the_avatar_field_and_nothing_changes(maria, upload):
    response = put(maria, name='Não grava', avatar=upload)
    assert response.status_code == 422 and 'avatar' in response.json()['errors']
    maria.refresh_from_db()
    assert maria.first_name == 'Maria' and not maria.avatar


def test_oversized_photo_and_blank_name_are_rejected(maria):
    with override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=None):
        big = SimpleUploadedFile('big.png', b'\x89PNG\r\n\x1a\n' + b'0' * (2 * media.MB + 1), content_type='image/png')
        assert put(maria, avatar=big).status_code == 422
    assert 'name' in put(maria, name='   ').json()['errors']


def test_works_for_superadmin_and_requires_authentication():
    root = get_user_model().objects.create_superuser(username='root')
    assert client(root).get(URL).json()['username'] == 'root'
    client(root).put(URL, {'name': 'Root', 'time_zone': 'UTC', 'avatar': png()}, format='multipart')
    root.refresh_from_db()
    assert root.avatar.name.startswith('system/avatars/')
    assert APIClient().get(URL).status_code == 401


def test_soft_deleting_the_user_removes_the_photo(maria, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        put(maria, avatar=png())
    maria.refresh_from_db()
    name = maria.avatar.name
    with django_capture_on_commit_callbacks(execute=True):
        maria.delete()
    assert not media.exists(name)
    assert get_user_model().all_objects.get(pk=maria.pk).avatar.name == ''
