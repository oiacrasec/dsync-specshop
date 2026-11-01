"""Controle remoto de deploy: Python local + Fabric/SSH, sem login interativo."""

import argparse
import io
import shlex
import sys
from pathlib import Path


# O worker usa só a biblioteca padrão; Fabric não é instalado na VPS ou no backend.
def execute_remote(connection, *, repo_dir, directory, command, name=None, no_pull=False):
    arguments = ['--repo-dir', repo_dir, '--directory', directory, command]
    if name:
        arguments.extend(['--name', name])
    if no_pull:
        arguments.append('--no-pull')
    worker = Path(__file__).with_name('deploy_server.py').read_text()
    # Só caminhos/opções vão no comando. Código via stdin; segredos gerados na VPS.
    remote = shlex.join(['python3', '-c', 'import sys; exec(sys.stdin.read())', *arguments])
    return connection.run(remote, in_stream=io.StringIO(worker), pty=False, echo=False)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Configurar/atualizar uma implantação remotamente por SSH.')
    parser.add_argument('--host', required=True, help='Alias de ~/.ssh/config ou usuario@servidor')
    parser.add_argument('--repo-dir', required=True, help='Checkout Git já clonado na VPS')
    parser.add_argument('--directory', required=True, help='Diretório de implantação na VPS')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('setup').add_argument('--name', required=True)
    commands.add_parser('deploy').add_argument('--no-pull', action='store_true')
    args = parser.parse_args(argv)
    try:
        from fabric import Connection
        from paramiko import RejectPolicy
    except ImportError:
        parser.exit(1, 'Instale as dependências de scripts/requirements.txt no ambiente de operação.\n')
    try:
        with Connection(args.host, connect_timeout=15, forward_agent=False) as connection:
            connection.client.load_system_host_keys()
            # Não aceitar silenciosamente chaves de servidor desconhecidas/alteradas.
            connection.client.set_missing_host_key_policy(RejectPolicy())
            execute_remote(
                connection,
                repo_dir=args.repo_dir,
                directory=args.directory,
                command=args.command,
                name=getattr(args, 'name', None),
                no_pull=getattr(args, 'no_pull', False),
            )
    except Exception as exc:  # Falhas SSH e de comando nunca liberam as etapas seguintes.
        print(f'Erro na operação remota ({type(exc).__name__}); verifique conexão e saída acima.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
