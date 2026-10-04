from apps.core.routers import SchemaRouter

from .views import ContractViewSet, OrganizationViewSet, PlanViewSet

router = SchemaRouter(use_regex_path=False)
router.register('plans', PlanViewSet, basename='admin-plan')
router.register('contracts', ContractViewSet, basename='admin-contract')
router.register('organizations', OrganizationViewSet, basename='organization')
urlpatterns = router.urls
