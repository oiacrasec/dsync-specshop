"""QuerySets e managers do BaseModel: soft delete e escopo de tenant (ADR 0006 §1.3, ADR 0007)."""

from django.db import models
from django.utils import timezone

from .tenancy import TenantContextMissing, get_context
from .utils import scope_filter


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


class ScopedManagerMixin:
    """Fail closed (ADR 0006 §1.3, camada B): filtra pelo contexto ou levanta erro.

    `unscoped()` é o único acesso global, sempre explícito (superadmin, comandos).
    """

    include_deleted = False

    def _base_queryset(self):
        queryset = super().get_queryset()
        return queryset if self.include_deleted else queryset.filter(deleted_at__isnull=True)

    def get_queryset(self):
        condition = scope_filter(self.model)
        queryset = self._base_queryset()
        return queryset if condition is None else queryset.filter(condition)

    def unscoped(self):
        return self._base_queryset()


class SoftDeleteManager(ScopedManagerMixin, models.Manager.from_queryset(SoftDeleteQuerySet)):
    """`objects`: com escopo, sem excluídos."""


class AllObjectsManager(ScopedManagerMixin, models.Manager.from_queryset(SoftDeleteQuerySet)):
    """`all_objects`: com escopo, inclui excluídos (auditoria, expurgo)."""

    include_deleted = True


class GlobalOnlyManager(models.Manager):
    """Registro sem escopo (padrão do AccessLog, ADR 0018): leitura só em `system_context()`
    ou por `unscoped()`, sempre explícita. Uso em registros declarados como sem escopo."""

    def get_queryset(self):
        context = get_context()
        if context is None or not context.system:
            raise TenantContextMissing(f'{self.model._meta.label} só é lido em system_context() ou por unscoped().')
        return super().get_queryset()

    def unscoped(self):
        return super().get_queryset()
