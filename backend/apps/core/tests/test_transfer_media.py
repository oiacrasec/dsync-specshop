from io import StringIO
from unittest import mock

import pytest
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from django.core.management import CommandError, call_command

from apps.core.storage import transfer_media

FILES = {'avatars/maria.webp': b'maria', 'avatars/2026/joao.webp': b'joao!', 'logo.png': b'logo'}


@pytest.fixture
def storages(tmp_path):
    source = FileSystemStorage(location=tmp_path / 'source')
    target = FileSystemStorage(location=tmp_path / 'target')
    for name, content in FILES.items():
        source.save(name, ContentFile(content))
    return source, target


def test_copies_every_file_keeping_names_and_is_incremental(storages):
    source, target = storages
    report = transfer_media(source, target)
    assert sorted(report.copied) == sorted(FILES) and not report.failed
    assert {name: target.open(name).read() for name in FILES} == FILES
    source.save('avatars/nova.webp', ContentFile(b'nova'))
    again = transfer_media(source, target)
    assert again.copied == ['avatars/nova.webp'] and sorted(again.skipped) == sorted(FILES)
    assert all(source.exists(name) for name in FILES)  # A origem nunca é apagada.


def test_dry_run_writes_nothing(storages):
    source, target = storages
    report = transfer_media(source, target, dry_run=True)
    assert sorted(report.copied) == sorted(FILES)
    assert not target.exists('logo.png')


def test_incomplete_copy_is_replaced_by_the_full_file(storages):
    source, target = storages
    target.save('logo.png', ContentFile(b'lo'))
    transfer_media(source, target)
    assert target.open('logo.png').read() == b'logo' and target.listdir('')[1] == ['logo.png']


def test_one_failure_does_not_stop_the_others(storages):
    source, target = storages
    original = target.save

    def flaky(name, content, *args, **kwargs):
        if name == 'logo.png':
            raise OSError('sem rede')
        return original(name, content, *args, **kwargs)

    with mock.patch.object(target, 'save', side_effect=flaky):
        report = transfer_media(source, target)
    assert report.failed == [('logo.png', 'sem rede')] and len(report.copied) == 2


def test_command_reports_and_fails_when_something_was_not_copied(storages):
    source, target = storages
    built = {'filesystem': source, 's3': target}
    out = StringIO()
    with mock.patch('apps.core.media.build_storage', side_effect=built.__getitem__):
        call_command('transfer_media', '--from', 'filesystem', '--to', 's3', stdout=out)
        assert 'Copiados: 3 · já no destino: 0 · falhas: 0' in out.getvalue()
        with mock.patch('apps.core.media.transfer_media') as transfer:
            transfer.return_value.copied, transfer.return_value.skipped = [], []
            transfer.return_value.failed = [('logo.png', 'sem rede')]
            with pytest.raises(CommandError):
                call_command(
                    'transfer_media', '--from', 'filesystem', '--to', 's3', stdout=StringIO(), stderr=StringIO()
                )
    with pytest.raises(CommandError):
        call_command('transfer_media', '--from', 's3', '--to', 's3')


def test_s3_target_is_built_from_the_same_env_variables(tmp_path):
    from apps.core.media import build_storage

    with mock.patch.dict('os.environ', {'DJANGO_MEDIA_S3_BUCKET': 'datasync-media'}):
        storage = build_storage('s3')
    assert storage.bucket_name == 'datasync-media' and storage.default_acl is None and storage.querystring_auth
