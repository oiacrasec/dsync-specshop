from django.contrib.auth import get_user_model
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, write_only=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        return get_user_model().normalize_username(value)


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True, trim_whitespace=False)
