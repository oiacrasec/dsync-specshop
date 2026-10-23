from django.core.management.base import BaseCommand, CommandError

from apps.core import media
from config.storage import MEDIA_BACKENDS


class Command(BaseCommand):
    help = (
        'Copia a mídia entre filesystem e s3 mantendo os nomes (ADR 0039). Incremental e sem apagar a '
        'origem: rode antes e depois de trocar DJANGO_MEDIA_STORAGE.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--from', dest='source', choices=MEDIA_BACKENDS, required=True)
        parser.add_argument('--to', dest='target', choices=MEDIA_BACKENDS, required=True)
        parser.add_argument('--dry-run', action='store_true', help='Só lista o que seria copiado.')

    def handle(self, *args, source, target, dry_run, **options):
        if source == target:
            raise CommandError('Origem e destino precisam ser diferentes.')
        report = media.transfer(source, target, dry_run=dry_run)
        verb = 'A copiar' if dry_run else 'Copiados'
        for name in report.copied:
            self.stdout.write(f'{verb}: {name}')
        for name, error in report.failed:
            self.stderr.write(f'Falha: {name} ({error})')
        self.stdout.write(
            f'{verb}: {len(report.copied)} · já no destino: {len(report.skipped)} · falhas: {len(report.failed)}'
        )
        if report.failed:
            raise CommandError('Há arquivos não copiados; corrija e rode de novo (é incremental).')
