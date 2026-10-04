from apps.core.serializers import ScopedModelSerializer

from .models import Organization


class OrganizationSerializer(ScopedModelSerializer):
    class Meta:
        model = Organization
        fields = ('public_id', 'name')
