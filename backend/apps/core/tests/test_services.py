import pytest
from django.core.exceptions import ImproperlyConfigured

from apps.contracts.models import Contract
from apps.contracts.services import PlanService
from apps.core.services import BaseModelService


def test_unregistered_model_cannot_be_deleted():
    with pytest.raises(ImproperlyConfigured, match='Register the model service'):
        BaseModelService.delete_instance(object(), actor=None)


def test_service_cannot_delete_another_model():
    with pytest.raises(ImproperlyConfigured, match='does not match'):
        PlanService.delete_instance(Contract(), actor=None)
