from apps.core.routers import SchemaRouter

from .views import TrackedProductViewSet

router = SchemaRouter(use_regex_path=False)
router.register('products', TrackedProductViewSet, basename='product')
urlpatterns = router.urls
