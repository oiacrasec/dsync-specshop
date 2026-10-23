import re
from pathlib import Path

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

FORBIDDEN = re.compile(
    r'\((?:views\.)?APIView\)|\((?:serializers\.)?Serializer\)|from rest_framework\.views import APIView'
)
BASES = {'apps/core/views.py', 'apps/core/serializers.py'}


def test_views_and_serializers_extend_the_project_bases():
    """Regra das bases: nunca `APIView` ou `serializers.Serializer` direto fora do core."""
    root = Path(settings.BASE_DIR)
    offenders = [
        str(path.relative_to(root))
        for folder in ('apps', 'config')
        for path in (root / folder).rglob('*.py')
        if '/tests/' not in str(path)
        and '/migrations/' not in str(path)
        and str(path.relative_to(root)) not in BASES
        and FORBIDDEN.search(path.read_text())
    ]
    assert offenders == [], f'Use BaseAPIView/BaseSerializer (apps.core): {offenders}'


@pytest.mark.django_db
def test_base_api_view_answers_no_store_on_success_and_on_error():
    user = get_user_model().objects.create_superuser(username='root')
    api = APIClient()
    api.force_authenticate(user)
    ok = api.get('/api/v1/permissions/')
    assert ok.status_code == 200 and 'no-store' in ok['Cache-Control']
    denied = APIClient().get('/api/v1/permissions/')
    assert denied.status_code == 401 and 'no-store' in denied['Cache-Control']
