"""Operações locais da VPS, somente biblioteca padrão (Python >= 3.11)."""

import argparse
import base64
import contextlib
import fcntl
import os
import re
import secrets
import subprocess
import sys
from pathlib import Path


class DeploymentError(Exception):
    """Erro operacional exibido sem valores sensíveis."""


def run(arguments, *, capture=False, env=None):
    # Listas fixas montadas pelo próprio script; nunca shell nem texto do usuário.
    return subprocess.run(arguments, check=True, text=True, capture_output=capture, env=env)  # noqa: S603


@contextlib.contextmanager
def lock(directory, filename):
    with (directory / filename).open('a') as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise DeploymentError('Outra operação desta implantação está em andamento.') from exc
        yield


def private_file(path, content):
    # O_EXCL evita sobrescrever inclusive um link simbólico existente.
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as handle:
        handle.write(content)


def backend_configuration(template):
    values = {
        'DJANGO_SECRET_KEY': secrets.token_hex(48),
        'DJANGO_JWT_SIGNING_KEY': secrets.token_hex(48),
        'DJANGO_MFA_ENCRYPTION_KEY': base64.urlsafe_b64encode(secrets.token_bytes(32)).decode(),
        'DATABASE_URL': 'postgres://CHANGE_ME',
        'DJANGO_ALLOWED_HOSTS': 'CHANGE_ME',
        'DJANGO_CSRF_TRUSTED_ORIGINS': 'https://CHANGE_ME',
        'DJANGO_ACCESS_LOG_IP_HEADER': 'X-Real-IP',
        'DJANGO_ACCESS_LOG_PORT_HEADER': 'X-Real-Port',
    }
    lines = []
    for line in template.splitlines():
        key = line.removeprefix('# ').partition('=')[0]
        lines.append(f'{key}={values[key]}' if key in values else line)
    return '\n'.join(lines) + '\n'


def validate_paths(repo, directory):
    if not repo.is_absolute() or not directory.is_absolute():
        raise DeploymentError('Informe caminhos absolutos para repositório e implantação.')
    repo, directory = repo.resolve(), directory.resolve()
    if directory == Path('/') or directory == repo or repo in directory.parents:
        raise DeploymentError('A implantação deve ficar fora do repositório e da raiz do servidor.')
    if re.search(r"""[\s$`"'\\]""", str(repo) + str(directory)):
        raise DeploymentError('Caminhos dotenv não podem conter espaços ou caracteres especiais de shell.')
    return repo, directory


def setup(repo, directory, name):
    repo, directory = validate_paths(repo, directory)
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]*', name):
        raise DeploymentError('Nome inválido; use letras minúsculas, números, _ ou -.')
    directory.mkdir(parents=True, exist_ok=True, mode=0o750)
    with lock(directory, '.setup.lock'):
        if any(os.path.lexists(directory / path) for path in ('.env', 'deploy.sh', 'deploy.py')):
            raise DeploymentError('Implantação já configurada ou parcial; arquivos foram preservados.')
        backend_env = directory / 'backend.env'
        if backend_env.is_symlink() or (backend_env.exists() and not backend_env.is_file()):
            raise DeploymentError('backend.env precisa ser um arquivo real.')
        configuration = None
        if not os.path.lexists(backend_env):
            configuration = backend_configuration((repo / 'backend/.env.example').read_text())
        uid, gid = os.getuid(), os.getgid()
        if uid == 0:
            uid, gid = 10001, 10001
        media = directory / 'media'
        if media.is_symlink() or (media.exists() and not media.is_dir()):
            raise DeploymentError('media precisa ser um diretório real.')
        if not media.exists():
            media.mkdir(mode=0o750)
            if os.getuid() == 0:
                os.chown(media, uid, gid)
        private_file(
            directory / '.env',
            (
                f'PROJECT_NAME={name}\nREPO_DIR={repo}\nDEPLOY_DIR={directory}\n'
                f'APP_UID={uid}\nAPP_GID={gid}\nBACKEND_PORT=8000\nFRONTEND_PORT=8080\n'
                'FRONTEND_API_BASE_URL=/api/v1\nGUNICORN_WORKERS=2\n'
            ),
        )
        if configuration is not None:
            private_file(backend_env, configuration)
        backend_env.chmod(0o600)
        private_file(
            directory / 'deploy.py',
            (
                '"""Atalho de operação local; configuração permanece fora do Git."""\n'
                'import runpy\nimport sys\n'
                f'sys.argv[1:1] = ["--repo-dir", {str(repo)!r}, "--directory", {str(directory)!r}]\n'
                f'runpy.run_path({str(repo / "scripts/deploy_server.py")!r}, run_name="__main__")\n'
            ),
        )
        print(f'Implantação criada em {directory}. Preencha .env e backend.env. Mídia: {media}/')


def deploy(repo, directory, *, pull=True):
    repo, directory = validate_paths(repo, directory)
    if not (directory / '.env').is_file() or not (directory / 'backend.env').is_file():
        raise DeploymentError('Execute setup primeiro.')
    with lock(directory, '.deploy.lock'):
        if run(['git', '-C', str(repo), 'status', '--porcelain'], capture=True).stdout.strip():
            raise DeploymentError('Repositório com alterações locais; commit ou restaure antes do deploy.')
        if pull:
            run(['git', '-C', str(repo), 'pull', '--ff-only'])
        if 'CHANGE_ME' in (directory / 'backend.env').read_text():
            raise DeploymentError('Preencha backend.env antes do deploy.')
        env = dict(os.environ, REPO_DIR=str(repo), DEPLOY_DIR=str(directory))
        for key in ('PROJECT_NAME', 'COMPOSE_PROJECT_NAME'):
            env.pop(key, None)
        compose = [
            'docker',
            'compose',
            '--parallel',
            '1',
            '--project-directory',
            str(repo / 'scripts'),
            '--env-file',
            str(directory / '.env'),
            '-f',
            str(repo / 'scripts/compose.yaml'),
        ]
        for command in (
            ['config', '--quiet'],
            ['build', '--pull'],
            [
                'run',
                '--rm',
                '--no-deps',
                'backend',
                'python',
                'manage.py',
                'check',
                '--deploy',
                '--fail-level',
                'WARNING',
            ],
            ['run', '--rm', '--no-deps', 'backend', 'python', 'manage.py', 'migrate', '--noinput'],
            ['up', '-d', '--wait', '--wait-timeout', '120'],
            ['ps'],
        ):
            run([*compose, *command], env=env)
        print(f'Deploy concluído. Mídia persistente: {directory}/media/')


def main(argv=None):
    parser = argparse.ArgumentParser(description='Operações locais da implantação; normalmente chamado via Fabric.')
    parser.add_argument('--repo-dir', required=True, type=Path)
    parser.add_argument('--directory', required=True, type=Path)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('setup').add_argument('--name', required=True)
    commands.add_parser('deploy').add_argument('--no-pull', action='store_true')
    args = parser.parse_args(argv)
    try:
        if args.command == 'setup':
            setup(args.repo_dir, args.directory, args.name)
        else:
            deploy(args.repo_dir, args.directory, pull=not args.no_pull)
    except (DeploymentError, OSError) as exc:
        print(f'Erro: {exc}', file=sys.stderr)
        return 1
    except subprocess.CalledProcessError:
        print('Erro: comando operacional falhou; etapas seguintes não executadas.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
