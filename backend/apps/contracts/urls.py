from rest_framework.routers import SimpleRouter

from .views import ContractViewSet, PlanViewSet

router = SimpleRouter(use_regex_path=False)
router.register('plans', PlanViewSet, basename='admin-plan')
router.register('contracts', ContractViewSet, basename='admin-contract')
urlpatterns = router.urls
