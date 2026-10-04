from django.db import models

from apps.core.models import ContractScopedModel, HybridScopedModel, OrganizationScopedModel, SharedModel


class ScopingCountry(SharedModel):
    name = models.CharField(max_length=64)


class ScopingCategory(HybridScopedModel):
    name = models.CharField(max_length=64)


class ScopingProduct(ContractScopedModel):
    name = models.CharField(max_length=64)


class ScopingMovement(OrganizationScopedModel):
    product = models.ForeignKey(ScopingProduct, on_delete=models.PROTECT, related_name='+')
    category = models.ForeignKey(ScopingCategory, on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    quantity = models.IntegerField(default=0)
