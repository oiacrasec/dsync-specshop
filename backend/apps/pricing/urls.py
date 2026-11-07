from django.urls import path

from apps.core.routers import SchemaRouter

from .views import PriceSearchViewSet, SearchItemRetryView, SearchItemRunView

router = SchemaRouter(use_regex_path=False)
router.register('searches', PriceSearchViewSet, basename='search')
urlpatterns = [
    path('searches/<uuid:search_id>/items/<uuid:item_id>/run/', SearchItemRunView.as_view(), name='search-item-run'),
    path(
        'searches/<uuid:search_id>/items/<uuid:item_id>/retry/',
        SearchItemRetryView.as_view(),
        name='search-item-retry',
    ),
    *router.urls,
]
