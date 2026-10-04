"""Services base: exclusão comum com autorização e auditoria explícitas."""

from contextlib import nullcontext

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.http import Http404


class BaseModelService:
    """Herde para definir model, autorização, estado e evento de exclusão."""

    model = None
    write_scope = staticmethod(nullcontext)
    _registry = {}

    @classmethod
    def register(cls, service):
        if not issubclass(service, BaseModelService) or service.model is None:
            raise ImproperlyConfigured('Register a model service with an explicit model.')
        cls._registry[service.model] = service

    @classmethod
    def delete_instance(cls, instance, *, actor):
        if cls.model is None:
            service = cls._registry.get(type(instance))
            if service is None:
                raise ImproperlyConfigured('Register the model service before exposing its API.')
            return service.delete_instance(instance, actor=actor)
        if not isinstance(instance, cls.model):
            raise ImproperlyConfigured('The instance does not match the service model.')
        with cls.write_scope(), transaction.atomic():
            cls.authorize(actor)
            try:
                current = cls.model.objects.select_for_update().get(pk=instance.pk)
            except cls.model.DoesNotExist:
                raise Http404 from None
            before = cls.state(current)
            current.delete(actor=actor)
            cls.audit_delete(current, actor, before)

    @staticmethod
    def save_instance(*, values, actor, instance=None):
        raise ImproperlyConfigured('Define domain write rules before exposing its API.')

    @staticmethod
    def authorize(actor):
        raise ImproperlyConfigured('Define service authorization before exposing its API.')

    @staticmethod
    def state(instance):
        raise ImproperlyConfigured('Define the audited state before exposing its API.')

    @staticmethod
    def audit_delete(instance, actor, before):
        raise ImproperlyConfigured('Define deletion auditing before exposing its API.')
