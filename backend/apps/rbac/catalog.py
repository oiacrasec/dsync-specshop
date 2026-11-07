"""Carga das permissões declaradas pelos apps (ADR 0044).

Cada app pode ter um módulo `permission_catalog.py` com:

- `PERMISSIONS`: definições `PermissionDefinition` do app;
- `RESOURCE_LABELS` e `PERMISSION_LABELS` (opcionais): rótulos para a interface.

O core declara as suas no próprio registry; projetos derivados acrescentam as deles
sem editar arquivos do core. Código ou rótulo repetido interrompe a inicialização.
"""

from importlib import import_module

from django.utils.module_loading import module_has_submodule

CATALOG_MODULE = 'permission_catalog'


def load_app_catalogs(app_configs, registry, resource_labels, permission_labels):
    for app_config in app_configs:
        if not module_has_submodule(app_config.module, CATALOG_MODULE):
            continue
        catalog = import_module(f'{app_config.name}.{CATALOG_MODULE}')
        registry.register(getattr(catalog, 'PERMISSIONS', ()))
        _merge_labels(resource_labels, getattr(catalog, 'RESOURCE_LABELS', {}), app_config.name)
        _merge_labels(permission_labels, getattr(catalog, 'PERMISSION_LABELS', {}), app_config.name)
    registry.freeze()


def _merge_labels(target, labels, app_name):
    repeated = target.keys() & labels.keys()
    if repeated:
        raise ValueError(f'{app_name} repeats permission labels: {", ".join(sorted(repeated))}.')
    target.update(labels)
