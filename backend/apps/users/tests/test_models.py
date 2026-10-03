import pytest
from django.contrib.auth import get_user_model


@pytest.mark.django_db
def test_create_user_hashes_password():
    user = get_user_model().objects.create_user(username='maria', password='s3nha-forte-123')

    assert user.pk is not None
    assert user.password != 's3nha-forte-123'
    assert user.check_password('s3nha-forte-123')
