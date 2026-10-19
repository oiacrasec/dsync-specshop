from apps.core.routers import SchemaRouter

from .views import OrganizationViewSet

router = SchemaRouter(use_regex_path=False)
router.register('organizations', OrganizationViewSet, basename='organization')
urlpatterns = router.urls
