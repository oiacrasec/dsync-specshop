from django.apps import apps
from django.core.checks import Error, Tags, register
from django.db import models

from .constants import SCOPE_EXCEPTIONS, UNSCOPED_RECORDS
from .models import BaseModel, ContractScopedModel, HybridScopedModel, OrganizationScopedModel, SharedModel

SCOPE_TYPES = (SharedModel, HybridScopedModel, ContractScopedModel, OrganizationScopedModel)


def _valid_context_fields(model, scope):
    expected = {}
    if scope in (HybridScopedModel, ContractScopedModel, OrganizationScopedModel):
        expected['contract'] = ('contracts.contract', scope is HybridScopedModel)
    if scope is OrganizationScopedModel:
        expected['organization'] = ('contracts.organization', False)
    fields = {field.name: field for field in model._meta.get_fields()}
    for name in ('contract', 'organization'):
        field = fields.get(name)
        if name not in expected:
            if field is not None:
                return False
            continue
        target, nullable = expected[name]
        if not isinstance(field, models.ForeignKey):
            return False
        remote = field.remote_field.model
        label = remote.lower() if isinstance(remote, str) else remote._meta.label_lower
        if (
            label != target
            or field.null is not nullable
            or field.blank is not nullable
            or field.remote_field.on_delete is not models.PROTECT
        ):
            return False
    return True


@register(Tags.models)
def check_model_scopes(app_configs, **kwargs):
    """Inspeciona metadados, sem queries; inclui proxies e models unmanaged próprios."""
    configs = apps.get_app_configs() if app_configs is None else app_configs
    errors = []
    for config in configs:
        if not config.name.startswith('apps.'):
            continue
        for model in config.get_models():  # Não inclui tabelas N:N automáticas.
            if model._meta.abstract:
                continue
            scopes = [scope for scope in SCOPE_TYPES if issubclass(model, scope)]
            if model._meta.label in SCOPE_EXCEPTIONS and issubclass(model, BaseModel) and not scopes:
                continue
            if model._meta.label in UNSCOPED_RECORDS and not issubclass(model, BaseModel):
                continue
            if not scopes:
                errors.append(
                    Error(
                        'Model próprio sem tipo de escopo declarado.',
                        hint='Herde um dos quatro tipos de apps.core.models (ADRs 0006 e 0012).',
                        obj=model,
                        id='core.E001',
                    )
                )
            elif len(scopes) != 1:
                errors.append(Error('Model deve herdar exatamente um tipo de escopo.', obj=model, id='core.E002'))
            elif not _valid_context_fields(model, scopes[0]):
                errors.append(
                    Error(
                        'Campos de contexto incompatíveis com o tipo de escopo.',
                        hint='Preserve os campos herdados, os destinos, a nulabilidade e PROTECT.',
                        obj=model,
                        id='core.E003',
                    )
                )
    return errors
