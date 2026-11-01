"""Coleta estáticos e entrega o processo ao Gunicorn."""

import os
import subprocess
import sys

subprocess.run([sys.executable, 'manage.py', 'collectstatic', '--noinput', '--verbosity', '0'], check=True)  # noqa: S603
# exec substitui este processo (sem shell): o Gunicorn passa a receber os sinais do contêiner.
os.execv(  # noqa: S606
    sys.executable,
    [
        sys.executable,
        '-m',
        'gunicorn',
        'config.wsgi:application',
        '--bind',
        '0.0.0.0:8000',
        '--workers',
        os.environ.get('GUNICORN_WORKERS', '2'),
        '--timeout',
        '60',
        '--access-logfile',
        '/dev/null',
        '--error-logfile',
        '-',
    ],
)
