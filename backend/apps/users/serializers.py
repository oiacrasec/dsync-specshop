from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.audit.models import AuditEventType as Event
from apps.core.serializers import BaseModelSerializer
from apps.core.tenancy import get_context

from .constants import MENU_MODES, THEME_PRESETS, THEME_PRIMARY_COLORS
from .utils import generate_temporary_password


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, write_only=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        return get_user_model().normalize_username(value)


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True, trim_whitespace=False)


class UserSummarySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name', read_only=True)
    must_change_password = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ['public_id', 'username', 'name', 'is_superuser', 'must_change_password']
        read_only_fields = fields

    def get_must_change_password(self, user):
        return user.must_change_password and not user.is_superuser


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': _('A nova senha e a confirmação não conferem.')})
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': _('A nova senha deve ser diferente da senha atual.')})
        return attrs


class ContractUserSerializer(BaseModelSerializer):
    """Usuários do contrato na área do cliente (8.1, decisões 54–56).

    Cadastro com username + nome e senha temporária gerada, devolvida uma única vez;
    escritas passam por save_user/delete_user (licenças, contrato e último admin).
    """

    username = serializers.CharField(max_length=150, validators=[get_user_model().username_validator])
    name = serializers.CharField(source='first_name', max_length=150)
    audit_fields = ('is_active',)
    audit_events = {'create': Event.USER_CREATED, 'update': Event.USER_UPDATED, 'delete': Event.USER_DELETED}

    class Meta:
        model = get_user_model()
        fields = ('public_id', 'username', 'name', 'is_active', 'must_change_password', 'created_at', 'updated_at')
        read_only_fields = ('public_id', 'must_change_password', 'created_at', 'updated_at')

    def validate_username(self, value):
        username = get_user_model().normalize_username(value.strip())
        taken = get_user_model().all_objects.unscoped().filter(username=username)
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError(_('Este nome de usuário já está em uso.'))
        return username

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError(_('Informe o nome do usuário.'))
        return name

    def create(self, validated_data):
        with transaction.atomic():
            actor = self.get_actor()
            user = get_user_model()(
                **validated_data, contract_id=get_context().contract_id, must_change_password=True, created_by=actor
            )
            self.temporary_password = generate_temporary_password(user)
            user.set_password(self.temporary_password)
            user.save(actor=actor)
            self.record_audit('create', user, actor, None)
            return user

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if getattr(self, 'temporary_password', None):
            data['temporary_password'] = self.temporary_password
        return data


class PreferencesSerializer(serializers.Serializer):
    """Aparência da interface do usuário (`/me/preferences/`); PUT envia o conjunto inteiro."""

    preset = serializers.ChoiceField(choices=THEME_PRESETS)
    primary = serializers.ChoiceField(choices=THEME_PRIMARY_COLORS)
    dark_mode = serializers.BooleanField()
    menu_mode = serializers.ChoiceField(choices=MENU_MODES)
