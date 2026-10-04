"""QuerySet e managers da trilha de auditoria: imutável e com escopo (ADR 0017)."""

from django.db import models

from apps.core.managers import ScopedManagerMixin, SoftDeleteQuerySet


class AppendOnlyQuerySet(SoftDeleteQuerySet):
    """Trilha imutável: nem soft delete nem update em lote (ADR 0017)."""

    def delete(self, *, actor=None):
        raise TypeError('Eventos de auditoria não podem ser excluídos.')

    def update(self, **kwargs):
        raise TypeError('Eventos de auditoria não podem ser alterados.')

    delete.queryset_only = True
    update.queryset_only = True


class AuditManager(ScopedManagerMixin, models.Manager.from_queryset(AppendOnlyQuerySet)):
    pass


class AllAuditManager(AuditManager):
    include_deleted = True
