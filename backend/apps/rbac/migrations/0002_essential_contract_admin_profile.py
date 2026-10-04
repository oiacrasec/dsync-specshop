"""Perfil essencial "Administrador do contrato" (ADR 0009 §2 e §5, etapa 3.4).

Migration de dados idempotente: cria o perfil do sistema em todo ambiente, sem passo
manual. Se ele existir excluído ou inativo, é restaurado. Não concede acesso a ninguém:
o superadmin atribui o perfil aos usuários (ADR 0010).
"""

from uuid import uuid7

from django.db import migrations

SYSTEM_KEY = 'contract_admin'
NAME = 'Administrador do contrato'


def ensure_essential_profile(apps, schema_editor):
    Profile = apps.get_model('rbac', 'Profile')
    manager = Profile._base_manager.using(schema_editor.connection.alias)
    profile = manager.filter(system_key=SYSTEM_KEY).first()
    if profile is None:
        manager.create(public_id=uuid7(), name=NAME, system_key=SYSTEM_KEY, contract=None)
    elif profile.deleted_at is not None or not profile.is_active:
        profile.deleted_at = None
        profile.deleted_by = None
        profile.is_active = True
        profile.save(update_fields=['deleted_at', 'deleted_by', 'is_active', 'updated_at'])


class Migration(migrations.Migration):
    dependencies = [
        ('rbac', '0001_initial'),
    ]

    # Reverter não apaga o perfil: ele pode estar atribuído (PROTECT).
    operations = [migrations.RunPython(ensure_essential_profile, migrations.RunPython.noop)]
