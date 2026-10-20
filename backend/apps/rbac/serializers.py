from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.contracts.models import Organization
from apps.core.permission_registry import PERMISSIONS, PermissionScope
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


class ExcludedPermissionSerializer(serializers.Serializer):
    organization = serializers.UUIDField(required=False, allow_null=True, default=None)
    permission = serializers.CharField(max_length=128)


class AccessGrantSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=[scope.value for scope in PermissionScope])
    organization = serializers.UUIDField(required=False, allow_null=True, default=None)
    profile = serializers.UUIDField(required=False, allow_null=True, default=None)
    permission = serializers.CharField(required=False, allow_blank=True, default='', max_length=128)
    excluded_organizations = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)
    excluded_permissions = ExcludedPermissionSerializer(many=True, required=False, default=list, max_length=200)

    def validate(self, attrs):
        if (attrs['profile'] is None) == (not attrs['permission']):
            raise serializers.ValidationError(_('Informe um perfil ou uma permissão.'))
        if (attrs['scope'] == PermissionScope.ORGANIZATION.value) == (attrs['organization'] is None):
            raise serializers.ValidationError(_('Informe a organização só no escopo de organização.'))
        if attrs['excluded_organizations'] and attrs['scope'] != PermissionScope.CONTRACT.value:
            raise serializers.ValidationError(_('Exceções de organização só valem no escopo de contrato.'))
        if attrs['excluded_permissions'] and attrs['profile'] is None:
            raise serializers.ValidationError(_('Exceções de permissão só valem para perfis.'))
        return attrs


class UserAccessSerializer(serializers.Serializer):
    """Concessões do usuário na aba Permissões (8.3); PUT substitui o conjunto inteiro."""

    grants = AccessGrantSerializer(many=True, max_length=500)

    def validate(self, attrs):
        contract_id = self.context['user'].contract_id
        organizations = dict(Organization.objects.filter(contract_id=contract_id).values_list('public_id', 'pk'))
        profiles = dict(
            Profile.objects.filter(Q(contract_id=contract_id) | Q(contract__isnull=True)).values_list('public_id', 'pk')
        )
        grants = []
        for grant in attrs['grants']:
            if grant['organization'] is not None and grant['organization'] not in organizations:
                raise serializers.ValidationError({'grants': _('Informe uma organização do contrato.')})
            if grant['profile'] is not None and grant['profile'] not in profiles:
                raise serializers.ValidationError({'grants': _('Informe um perfil disponível.')})
            excluded = [
                *grant['excluded_organizations'],
                *(item['organization'] for item in grant['excluded_permissions']),
            ]
            if any(item is not None and item not in organizations for item in excluded):
                raise serializers.ValidationError({'grants': _('Informe uma organização do contrato.')})
            grants.append(
                {
                    'scope': grant['scope'],
                    'scope_organization_id': organizations.get(grant['organization']),
                    'profile_id': profiles.get(grant['profile']),
                    'permission_code': grant['permission'],
                    'exclusions': {(organizations[item], '') for item in grant['excluded_organizations']}
                    | {
                        (organizations.get(item['organization']), item['permission'])
                        for item in grant['excluded_permissions']
                    },
                }
            )
        attrs['grants'] = grants
        return attrs
