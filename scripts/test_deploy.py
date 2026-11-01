"""Testes da automação sem conexão externa, banco ou daemon Docker."""

import base64
import contextlib
import io
import os
import re
import shlex
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import deploy as remote
import deploy_server as server


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.repo = self.root / 'repo'
        (self.repo / 'backend').mkdir(parents=True)
        (self.repo / 'backend/.env.example').write_text(
            Path(__file__).resolve().parents[1].joinpath('backend/.env.example').read_text()
        )
        self.directory = self.root / 'deployment'

    def setup(self, directory=None):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            server.setup(self.repo, directory or self.directory, 'proj-x')
        return output.getvalue()

    def values(self, directory=None):
        return dict(
            line.split('=', 1)
            for line in ((directory or self.directory) / 'backend.env').read_text().splitlines()
            if line and not line.startswith('#') and '=' in line
        )

    def test_keys_template_permissions_and_no_secret_output(self):
        output = self.setup()
        values = self.values()
        keys = [values[name] for name in ('DJANGO_SECRET_KEY', 'DJANGO_JWT_SIGNING_KEY', 'DJANGO_MFA_ENCRYPTION_KEY')]
        self.assertTrue(all(key not in output for key in keys))
        self.assertEqual(len(set(keys)), 3)
        self.assertTrue(all(re.fullmatch(r'[a-f0-9]{96}', key) for key in keys[:2]))
        self.assertEqual(len(base64.urlsafe_b64decode(keys[2])), 32)
        self.assertEqual(os.stat(self.directory / 'backend.env').st_mode & 0o777, 0o600)
        self.assertEqual(values['DATABASE_URL'], 'postgres://CHANGE_ME')
        self.assertIn('# Mídia (ADR 0039)', (self.directory / 'backend.env').read_text())
        other = self.root / 'other'
        self.setup(other)
        self.assertTrue(
            all(self.values(other)[name] != value for name, value in values.items() if name.endswith('_KEY'))
        )

    def test_existing_installation_and_media_are_preserved(self):
        self.setup()
        (self.directory / 'media/file').write_text('persistent')
        before = (self.directory / 'backend.env').read_bytes()
        with self.assertRaises(server.DeploymentError):
            self.setup()
        self.assertTrue(before == (self.directory / 'backend.env').read_bytes())
        self.assertEqual((self.directory / 'media/file').read_text(), 'persistent')

    def test_existing_backend_env_is_preserved(self):
        self.directory.mkdir()
        (self.directory / 'backend.env').write_text('existing')
        self.setup()
        self.assertEqual((self.directory / 'backend.env').read_text(), 'existing')

    def test_invalid_paths_names_and_symlinks(self):
        for directory in (self.repo, self.repo / 'deployment', Path('/'), Path('relative')):
            with self.assertRaises(server.DeploymentError):
                server.setup(self.repo, directory, 'proj-x')
        with self.assertRaises(server.DeploymentError):
            server.setup(self.repo, self.directory, '../invalid')
        self.directory.mkdir()
        (self.directory / 'media').symlink_to(self.repo, target_is_directory=True)
        with self.assertRaises(server.DeploymentError):
            self.setup()
        self.assertFalse((self.directory / '.env').exists())

    def test_random_failure_prevents_configuration_creation(self):
        with patch.object(server.secrets, 'token_hex', side_effect=OSError('entropy unavailable')):
            with self.assertRaises(OSError):
                self.setup()
        self.assertFalse((self.directory / '.env').exists())
        self.assertFalse((self.directory / 'backend.env').exists())

    def test_deploy_lock_and_dirty_checkout_block_commands(self):
        self.setup()
        with server.lock(self.directory, '.deploy.lock'), patch.object(server, 'run') as run:
            with self.assertRaises(server.DeploymentError):
                server.deploy(self.repo, self.directory)
            run.assert_not_called()
        with patch.object(server, 'run', return_value=Mock(stdout='modified')) as run:
            with self.assertRaises(server.DeploymentError):
                server.deploy(self.repo, self.directory)
            self.assertEqual(run.call_count, 1)

    def configure(self):
        self.setup()
        env = self.directory / 'backend.env'
        env.write_text(env.read_text().replace('CHANGE_ME', 'configured'))

    def test_deploy_order_and_failures(self):
        self.configure()
        for failure in ('build', 'migrate', None):
            calls = []

            def run(arguments, calls=calls, failure=failure, **kwargs):
                calls.append(arguments)
                if failure and failure in arguments:
                    raise subprocess.CalledProcessError(42, arguments)
                return Mock(stdout='')

            with patch.object(server, 'run', side_effect=run), contextlib.redirect_stdout(io.StringIO()):
                if failure:
                    with self.assertRaises(subprocess.CalledProcessError):
                        server.deploy(self.repo, self.directory)
                    self.assertFalse(any('up' in command for command in calls))
                else:
                    server.deploy(self.repo, self.directory)
                    self.assertEqual(calls[1][-2:], ['pull', '--ff-only'])
                    self.assertEqual(len(calls), 8)
                    self.assertEqual(calls[-2][-5:], ['up', '-d', '--wait', '--wait-timeout', '120'])

    def test_placeholders_block_docker(self):
        self.setup()
        with patch.object(server, 'run', return_value=Mock(stdout='')) as run:
            with self.assertRaises(server.DeploymentError):
                server.deploy(self.repo, self.directory, pull=False)
            self.assertEqual(run.call_count, 1)

    def test_remote_payload_quoting_and_no_pty(self):
        connection = Mock()
        remote.execute_remote(
            connection,
            repo_dir='/srv/apps/proj-x;echo bad',
            directory='/srv/deploy/proj-x',
            command='setup',
            name='proj-x',
        )
        command = connection.run.call_args.args[0]
        arguments = shlex.split(command)
        self.assertEqual(arguments[0], 'python3')
        self.assertIn('/srv/apps/proj-x;echo bad', arguments)
        options = connection.run.call_args.kwargs
        self.assertFalse(options['pty'])
        self.assertFalse(options['echo'])
        self.assertIn('secrets.token_hex', options['in_stream'].getvalue())

    def test_remote_cli_forwards_options_and_rejects_unknown_host_keys(self):
        connection = Mock()
        manager = Mock()
        manager.__enter__ = Mock(return_value=connection)
        manager.__exit__ = Mock(return_value=False)
        fake_fabric = Mock(Connection=Mock(return_value=manager))
        fake_paramiko = Mock()
        with (
            patch.dict('sys.modules', fabric=fake_fabric, paramiko=fake_paramiko),
            patch.object(remote, 'execute_remote') as execute,
        ):
            result = remote.main(
                [
                    '--host',
                    'deploy@vps',
                    '--repo-dir',
                    '/srv/apps/x',
                    '--directory',
                    '/srv/deploy/x',
                    'deploy',
                ]
            )
        self.assertEqual(result, 0)
        fake_fabric.Connection.assert_called_once_with('deploy@vps', connect_timeout=15, forward_agent=False)
        connection.client.load_system_host_keys.assert_called_once()
        connection.client.set_missing_host_key_policy.assert_called_once_with(fake_paramiko.RejectPolicy.return_value)
        self.assertEqual(execute.call_args.kwargs['command'], 'deploy')


if __name__ == '__main__':
    unittest.main()
