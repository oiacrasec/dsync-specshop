from django.contrib.auth.management.commands.changepassword import Command as ChangePasswordCommand

from apps.core.tenancy import system_context


class Command(ChangePasswordCommand):
    """`changepassword` do Django em `system_context()`: o manager do usuário exige tenant.

    Só vale porque `apps.core` precede `django.contrib.auth` em `INSTALLED_APPS`.
    """

    def handle(self, *args, **options):
        with system_context():
            return super().handle(*args, **options)
