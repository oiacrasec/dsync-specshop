"""Pesquisa de preços sob demanda (ADR 2003 §4): criar, consultar e executar cada linha."""

from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from drf_spectacular.utils import extend_schema

from apps.core.responses import build_exception_response, build_result_response
from apps.core.views import BaseAPIView, BaseModelViewSet

from . import services
from .filters import PriceSearchFilterSet
from .models import PriceSearch, PriceSearchItem
from .serializers import PriceSearchItemSerializer, PriceSearchSerializer


class PriceSearchViewSet(BaseModelViewSet):
    model = PriceSearch
    serializer_class = PriceSearchSerializer
    filterset_class = PriceSearchFilterSet
    permission_resource = 'search'
    # Pesquisa não é editada nem excluída: a execução e a nova tentativa têm rotas próprias.
    http_method_names = ['get', 'post', 'head', 'options']
    options_label_field = 'created_at'
    options_search_fields = ()
    schema_columns = ('created_at', 'destination_zip')
    schema_filters = ()

    def get_schema_filters(self):
        return [
            *super().get_schema_filters(),
            {'field': 'date_from', 'label': 'De', 'type': 'date', 'placement': 'general'},
            {'field': 'date_to', 'label': 'Até', 'type': 'date', 'placement': 'general'},
        ]

    def get_queryset(self):
        items = PriceSearchItem.objects.select_related('product').order_by('product__name', 'source', 'pk')
        return super().get_queryset().prefetch_related(Prefetch('items', queryset=items))


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class SearchItemRunView(BaseAPIView):
    """Executa uma linha pendente (uma requisição por produto, até 3 em paralelo pela tela).

    Sem ATOMIC_REQUESTS: a chamada à fonte externa fica fora de transação; o serviço abre as
    transações curtas de reserva e de gravação.
    """

    required_permission = 'search:create'
    retry = False

    @extend_schema(request=None, responses={200: PriceSearchItemSerializer})
    def post(self, request, search_id, item_id):
        try:
            item = get_object_or_404(PriceSearchItem.objects.only('pk'), public_id=item_id, search__public_id=search_id)
            item = services.run_item(item.pk, retry=self.retry, user=request.user)
            item = PriceSearchItem.objects.select_related('product').get(pk=item.pk)
            return build_result_response(PriceSearchItemSerializer(item).data)
        except Exception as exc:
            return build_exception_response(exception=exc, request=request)


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class SearchItemRetryView(SearchItemRunView):
    """Nova tentativa de uma linha indisponível ou com erro (RF-25: só por ação do usuário)."""

    required_permission = 'search:update'
    retry = True
