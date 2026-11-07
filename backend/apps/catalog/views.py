"""Produtos acompanhados (RF-01): dados do contrato, visíveis em todas as organizações."""

from apps.core.views import BaseModelViewSet
from apps.rbac.permissions import ContractWidePermission

from .filters import TrackedProductFilterSet
from .models import TrackedProduct
from .serializers import TrackedProductSerializer


class TrackedProductViewSet(BaseModelViewSet):
    model = TrackedProduct
    serializer_class = TrackedProductSerializer
    filterset_class = TrackedProductFilterSet
    # Produto é do contrato (ADR 2003 §1): permissão em qualquer escopo vale para o contrato.
    permission_classes = [ContractWidePermission]
    permission_resource = 'product'
    options_label_field = 'name'
    options_search_fields = ('name', 'model')
    schema_columns = ('name', 'model', 'brand', 'ean')
    schema_filters = ('brand',)
