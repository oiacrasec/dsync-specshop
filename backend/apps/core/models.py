import re
from uuid import uuid7

from django.conf import settings
from django.db import models, router
from django.db.models.base import ModelBase
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class DscModelBase(ModelBase):
    """Define a tabela antes de o Django preparar relações N:N automáticas."""

    def __new__(cls, name, bases, attrs, **kwargs):
        meta = attrs.get('Meta')
        if not getattr(meta, 'abstract', False) and not getattr(meta, 'proxy', False):
            if meta is None:
                meta = type('Meta', (), {})
                attrs['Meta'] = meta
            if not getattr(meta, 'db_table', None):
                table = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name)
                table = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', table).lower()
                meta.db_table = f'dsc_{table}'
        return super().__new__(cls, name, bases, attrs, **kwargs)


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self, *, actor=None):
        """Exclui em uma única atualização, sem cascata ou remoção física."""
        if self.query.is_sliced:
            raise TypeError('Cannot delete a sliced queryset.')
        if self.query.distinct_fields or self._fields is not None:
            raise TypeError('Cannot delete a distinct or values queryset.')
        now = timezone.now()
        changes = {'deleted_at': now, 'deleted_by': actor, 'updated_at': now}
        if actor is not None:
            changes['updated_by'] = actor
        count = self.filter(deleted_at__isnull=True).update(**changes)
        self._result_cache = None
        return count, {self.model._meta.label: count}

    delete.alters_data = True
    delete.queryset_only = True


class SoftDeleteManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


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

    objects = SoftDeleteManager()
    all_objects = models.Manager.from_queryset(SoftDeleteQuerySet)()

    class Meta:
        abstract = True
        default_manager_name = 'objects'
        base_manager_name = 'all_objects'

    def save(self, *args, actor=None, **kwargs):
        if actor is not None:
            if self._state.adding:
                self.created_by = actor
            self.updated_by = actor
            if kwargs.get('update_fields'):
                kwargs['update_fields'] = set(kwargs['update_fields']) | {'updated_by', 'updated_at'}
        return super().save(*args, **kwargs)

    save.alters_data = True

    def delete(self, using=None, keep_parents=False, *, actor=None):
        if self.pk is None:
            raise ValueError('Cannot delete an unsaved instance.')
        database = using or router.db_for_write(type(self), instance=self)
        result = type(self).all_objects.using(database).filter(pk=self.pk).delete(actor=actor)
        self.refresh_from_db(using=database)
        return result

    delete.alters_data = True
