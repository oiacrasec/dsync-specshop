import pytest
from django.db import models
from django.test.utils import isolate_apps

from apps.core.managers import GlobalOnlyManager
from apps.core.tenancy import TenantContext, TenantContextMissing, system_context, use_context


@isolate_apps('apps.core')
def test_global_only_manager_reads_only_in_system_context_or_unscoped():
    meta = type('Meta', (), {'app_label': 'core'})
    record = type(
        'GlobalRecord', (models.Model,), {'__module__': __name__, 'Meta': meta, 'objects': GlobalOnlyManager()}
    )

    for any_context in (None, TenantContext(superuser=True)):
        with use_context(any_context), pytest.raises(TenantContextMissing):
            record.objects.all()
    with use_context(None):
        assert record.objects.unscoped().model is record
    with system_context():
        assert record.objects.all().model is record
