from types import SimpleNamespace

import pytest
from django.apps import apps
from django.core.checks import Tags, run_checks
from django.db import models
from django.test.utils import isolate_apps

from apps.core.checks import check_model_scopes
from apps.core.constants import SCOPE_EXCEPTIONS
from apps.core.models import BaseModel, ContractScopedModel, HybridScopedModel, OrganizationScopedModel, SharedModel


def config_for(*model_types, name='apps.core'):
    return SimpleNamespace(name=name, label=name.rsplit('.', 1)[-1], get_models=lambda **kwargs: iter(model_types))


def make_model(name, *bases, **fields):
    meta_base = getattr(bases[0], 'Meta', object)
    meta = type('Meta', (meta_base,), {'app_label': 'core', 'abstract': False})
    return type(name, bases, {'__module__': 'apps.core.models', 'Meta': meta, **fields})


@isolate_apps('apps.core')
@pytest.mark.parametrize('scope', [SharedModel, HybridScopedModel, ContractScopedModel, OrganizationScopedModel])
def test_scope_is_inherited_without_repeating_context(scope):
    concrete = make_model('Record', scope)
    descendant = make_model('Child', concrete)
    assert check_model_scopes([config_for(concrete, descendant)]) == []
    assert issubclass(concrete, BaseModel)
    assert concrete._meta.db_table == 'dsc_record'
    assert concrete._meta.default_manager_name == 'objects'
    assert concrete._meta.base_manager_name == '_base_objects'  # all_objects tem escopo (2.4).
    assert concrete._meta.get_field('public_id').unique
    if scope is OrganizationScopedModel:
        assert any(index.fields == ['contract', 'organization'] for index in concrete._meta.indexes)


@isolate_apps('apps.core')
@pytest.mark.parametrize('base', [models.Model, BaseModel])
def test_missing_scope_is_rejected_even_for_unmanaged_models(base):
    concrete = make_model('Undeclared', base)
    concrete._meta.managed = False
    errors = check_model_scopes([config_for(concrete)])
    assert [(error.id, error.obj) for error in errors] == [('core.E001', concrete)]


@isolate_apps('apps.core')
def test_multiple_scopes_are_rejected():
    concrete = make_model('Ambiguous', SharedModel, ContractScopedModel)
    assert [error.id for error in check_model_scopes([config_for(concrete)])] == ['core.E002']


@isolate_apps('apps.core')
def test_context_relations_resolve_to_concrete_models():
    contract_meta = type('Meta', (BaseModel.Meta,), {'app_label': 'contracts', 'abstract': False})
    contract = make_model('Contract', BaseModel, Meta=contract_meta)
    organization_meta = type('Meta', (ContractScopedModel.Meta,), {'app_label': 'contracts', 'abstract': False})
    organization = make_model('Organization', ContractScopedModel, Meta=organization_meta)
    record = make_model('StockEntry', OrganizationScopedModel)
    assert record._meta.get_field('contract').remote_field.model is contract
    assert record._meta.get_field('organization').remote_field.model is organization
    assert check_model_scopes([config_for(contract, organization, record)]) == []


@isolate_apps('apps.core')
@pytest.mark.parametrize(
    ('scope', 'field'),
    [
        (ContractScopedModel, models.ForeignKey('contracts.Contract', on_delete=models.PROTECT, null=True)),
        (HybridScopedModel, models.ForeignKey('contracts.Contract', on_delete=models.PROTECT)),
        (ContractScopedModel, models.ForeignKey('contracts.Contract', on_delete=models.CASCADE)),
        (ContractScopedModel, models.ForeignKey('users.User', on_delete=models.PROTECT)),
        (ContractScopedModel, models.IntegerField()),
        (SharedModel, models.ForeignKey('contracts.Contract', on_delete=models.PROTECT)),
    ],
)
def test_scope_cannot_be_bypassed_by_overriding_fields(scope, field):
    concrete = make_model('Invalid', scope, contract=field)
    assert [error.id for error in check_model_scopes([config_for(concrete)])] == ['core.E003']


@isolate_apps('apps.core')
def test_organization_context_cannot_be_removed():
    meta = type('Meta', (OrganizationScopedModel.Meta,), {'app_label': 'core', 'abstract': False, 'indexes': []})
    concrete = make_model('MissingOrganization', OrganizationScopedModel, organization=None, Meta=meta)
    assert [error.id for error in check_model_scopes([config_for(concrete)])] == ['core.E003']


@isolate_apps('apps.core')
def test_proxy_inherits_scope_and_unscoped_proxy_is_rejected():
    scoped = make_model('Scoped', SharedModel)
    unscoped = make_model('Unscoped', BaseModel)
    proxy_meta = type('Meta', (), {'app_label': 'core', 'proxy': True})
    good = type('ScopedProxy', (scoped,), {'__module__': __name__, 'Meta': proxy_meta})
    bad = type('UnscopedProxy', (unscoped,), {'__module__': __name__, 'Meta': proxy_meta})
    assert check_model_scopes([config_for(good)]) == []
    assert [error.id for error in check_model_scopes([config_for(bad)])] == ['core.E001']


@isolate_apps('apps.core')
def test_exceptions_are_exact_labels_not_class_names():
    assert SCOPE_EXCEPTIONS == {'users.User', 'contracts.Contract'}
    impostors = [make_model('User', BaseModel), make_model('Contract', BaseModel)]
    assert len(check_model_scopes([config_for(*impostors)])) == 2
    for label in SCOPE_EXCEPTIONS:
        app_label, name = label.split('.')
        meta = type('Meta', (), {'app_label': app_label})
        model = type(name, (BaseModel,), {'__module__': __name__, 'Meta': meta})
        assert check_model_scopes([config_for(model)]) == []


@isolate_apps('apps.core')
def test_third_party_apps_are_not_subject_to_project_scopes():
    external = make_model('External', models.Model)
    assert check_model_scopes([config_for(external, name='vendor.app')]) == []


@pytest.mark.django_db
def test_registered_check_respects_app_selection_and_uses_no_queries(django_assert_num_queries):
    with django_assert_num_queries(0):
        assert check_model_scopes(None) == []
        assert check_model_scopes([]) == []
        assert run_checks(app_configs=[apps.get_app_config('users')], tags=[Tags.models]) == []


@isolate_apps('apps.core')
def test_registered_check_rejects_new_unscoped_model():
    concrete = make_model('ForgottenScope', BaseModel)
    errors = run_checks(app_configs=[config_for(concrete)], tags=[Tags.models])
    assert any(error.id == 'core.E001' and error.obj is concrete for error in errors)


@pytest.mark.parametrize('scope', [SharedModel, HybridScopedModel, ContractScopedModel, OrganizationScopedModel])
def test_scope_bases_are_abstract_and_do_not_create_tables(scope):
    assert scope._meta.abstract
    assert scope not in apps.get_models()


@isolate_apps('apps.core')
def test_project_unscoped_records_are_accepted_only_outside_base_model(settings):
    record = make_model('ProjectRecord', models.Model)
    scoped_impostor = make_model('ProjectBaseRecord', BaseModel)
    assert [error.id for error in check_model_scopes([config_for(record)])] == ['core.E001']

    settings.UNSCOPED_PROJECT_RECORDS = frozenset({'core.ProjectRecord', 'core.ProjectBaseRecord'})
    assert check_model_scopes([config_for(record)]) == []
    assert [error.id for error in check_model_scopes([config_for(scoped_impostor)])] == ['core.E001']
