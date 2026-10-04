from rest_framework import serializers

from apps.contracts.models import Organization


class OrganizationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['public_id', 'name']
        read_only_fields = fields
