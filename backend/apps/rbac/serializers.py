from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.contracts.models import Organization
from apps.core.permission_registry import PERMISSIONS
from apps.core.tenancy import get_context

from . import services
from .constants import ESSENTIAL_PROFILE_KEY
from .models import Profile, ProfilePermission


class OrganizationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['public_id', 'name']
        read_only_fields = fields


class ProfileSerializer(serializers.ModelSerializer):
    """Perfis da área do cliente (8.2): do contrato (editáveis) e do sistema (só leitura).

    Escritas passam pelos services de RBAC (autorização no contrato, nomes, registry,
    escopos das atribuições existentes, perfil em uso e auditoria).
    """

    permissions = serializers.ListField(child=serializers.CharField(max_length=100), required=False, write_only=True)
    is_system = serializers.SerializerMethodField()
    is_essential = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            'public_id',
            'name',
            'is_active',
            'permissions',
            'is_system',
            'is_essential',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('public_id', 'created_at', 'updated_at')

    def get_is_system(self, profile):
        return profile.contract_id is None

    def get_is_essential(self, profile):
        return profile.system_key == ESSENTIAL_PROFILE_KEY

    def to_representation(self, profile):
        data = super().to_representation(profile)
        if profile.system_key == ESSENTIAL_PROFILE_KEY:
            data['permissions'] = sorted(definition.code for definition in PERMISSIONS)
        else:
            data['permissions'] = sorted(item.permission_code for item in profile.permissions.all())
        return data

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError(_('Informe o nome do perfil.'))
        return name

    def validate_permissions(self, value):
        return sorted(set(value))

    def create(self, validated_data):
        codes = validated_data.pop('permissions', [])
        actor = self.context['request'].user
        profile = Profile(contract_id=get_context().contract_id, **validated_data)
        profile, _warnings = services.save_profile(profile=profile, actor=actor)
        self._sync_permissions(profile, codes, actor)
        return profile

    def update(self, profile, validated_data):
        codes = validated_data.pop('permissions', None)
        actor = self.context['request'].user
        for field, value in validated_data.items():
            setattr(profile, field, value)
        profile, _warnings = services.save_profile(profile=profile, actor=actor)
        if codes is not None:
            self._sync_permissions(profile, codes, actor)
        return profile

    def delete(self):
        services.delete_profile(profile=self.instance, actor=self.context['request'].user)

    def _sync_permissions(self, profile, codes, actor):
        current = {item.permission_code: item for item in ProfilePermission.objects.filter(profile=profile)}
        for code in sorted(current.keys() - set(codes)):
            services.delete_profile_permission(permission=current[code], actor=actor)
        for code in sorted(set(codes) - current.keys()):
            permission = ProfilePermission(profile=profile, contract_id=profile.contract_id, permission_code=code)
            services.save_profile_permission(permission=permission, actor=actor)
        profile.__dict__.pop('_prefetched_objects_cache', None)
