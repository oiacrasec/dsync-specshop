from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from rest_framework.exceptions import PermissionDenied

from apps.core.tenancy import system_context
from apps.users.services import reset_mfa


class Command(BaseCommand):
    help = 'Redefine o MFA de um superadmin, com autoria de um superadmin ativo e auditoria.'

    def add_arguments(self, parser):
        parser.add_argument('username')
        parser.add_argument('--actor', required=True)

    def handle(self, *args, **options):
        with system_context():
            users = get_user_model().objects.filter(is_superuser=True)
            try:
                user = users.get(username=options['username'])
                actor = users.get(username=options['actor'], is_active=True)
            except get_user_model().DoesNotExist:
                raise CommandError('Informe contas de superadmin disponíveis e um autor ativo.') from None
            try:
                reset_mfa(user=user, actor=actor, allow_superadmin=True)
            except PermissionDenied:
                raise CommandError('A operação exige um superadmin ativo.') from None
        self.stdout.write(self.style.SUCCESS('MFA redefinido e sessões encerradas. Configure novamente no Perfil.'))
