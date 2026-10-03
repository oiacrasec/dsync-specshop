from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    Usuário do sistema.

    Modelo customizado desde o início para permitir evolução sem migrações
    complexas. Novos campos pessoais exigem finalidade e base legal
    definidas (skill lgpd).
    """

    class Meta:
        verbose_name = 'usuário'
        verbose_name_plural = 'usuários'
