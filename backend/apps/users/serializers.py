from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers


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
