# Models — exemplo de estilo

Referência para o [padrão de models Django](../standards/django-style.md).
Os trechos abaixo são Python, apresentados como texto para preservar a
formatação manual também na documentação.

## Campos compactos

Trecho do `BaseModel` existente em `apps/core/models.py`. Esses campos já são
herdados pelos models próprios; não devem ser copiados para cada entidade.

```text
class BaseModel(models.Model, metaclass=DscModelBase):
    """Persistência comum; autoria é explícita, não inferida da requisição."""

    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(_('identificador público'), default=uuid7, unique=True, editable=False)
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('criado por'),
                                   on_delete=models.SET_NULL, null=True, blank=True, editable=False, related_name='+',)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('atualizado por'),
                                   on_delete=models.SET_NULL, null=True, blank=True, editable=False, related_name='+',)
    is_active = models.BooleanField(_('ativo'), default=True)
    deleted_at = models.DateTimeField(_('excluído em'), null=True, blank=True, editable=False)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('excluído por'),
                                   on_delete=models.SET_NULL, null=True, blank=True, editable=False, related_name='+',)
```

Imports, managers, `Meta` e métodos foram omitidos deste primeiro trecho;
consulte o arquivo real para a implementação completa.

## User atual

O usuário recebe os campos do `BaseModel` por herança, sem redeclará-los:

```text
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel
from apps.users.managers import UserManager


class User(AbstractUser, BaseModel):
    """Usuário do sistema."""

    objects = UserManager()

    class Meta(BaseModel.Meta):
        abstract = False
        verbose_name = _('usuário')
        verbose_name_plural = _('usuários')
```

A tabela `dsc_user` é gerada automaticamente. O `is_active` vem do `AbstractUser`;
a autenticação e o soft delete mantêm seus comportamentos atuais.
