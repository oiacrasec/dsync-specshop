import pytest
from django.contrib.auth import get_user_model


@pytest.mark.django_db
def test_create_user_hashes_password(user_contract):
    user = get_user_model().objects.create_user(username='maria', password='s3nha-forte-123', contract=user_contract)

    assert user.pk is not None
    assert user.password != 's3nha-forte-123'
    assert user.check_password('s3nha-forte-123')


@pytest.mark.django_db
def test_create_superuser_without_django_admin():
    user = get_user_model().objects.create_superuser(username='superadmin', password='s3nha-forte-123')

    assert user.pk is not None
    assert user.is_superuser
    assert user.check_password('s3nha-forte-123')
