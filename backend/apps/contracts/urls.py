from apps.core.routers import SchemaRouter

from .views import ContractViewSet, PlanViewSet

router = SchemaRouter(use_regex_path=False)
router.register('plans', PlanViewSet, basename='admin-plan')
router.register('contracts', ContractViewSet, basename='admin-contract')
urlpatterns = router.urls
