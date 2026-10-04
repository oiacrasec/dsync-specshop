"""QuerySets e managers da auditoria (ADR 0017) e do registro de acesso (ADR 0018)."""

from django.db import models

from apps.core.managers import ScopedManagerMixin, SoftDeleteQuerySet
from apps.core.tenancy import TenantContextMissing, get_context


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


class AccessLogQuerySet(models.QuerySet):
    """Registro de acesso: só inserção; o expurgo terá rotina própria (ADR 0007 §4.2)."""

    def delete(self):
        raise TypeError('Registros de acesso não podem ser excluídos fora do expurgo.')

    def update(self, **kwargs):
        raise TypeError('Registros de acesso não podem ser alterados.')

    delete.queryset_only = True
    update.queryset_only = True


class AccessLogManager(models.Manager.from_queryset(AccessLogQuerySet)):
    """Leitura só global e explícita (`system_context()` ou `unscoped()`): ordem judicial (art. 15 §3º)."""

    def get_queryset(self):
        context = get_context()
        if context is None or not context.system:
            raise TenantContextMissing('AccessLog só é lido em system_context() ou por unscoped().')
        return super().get_queryset()

    def unscoped(self):
        return super().get_queryset()
