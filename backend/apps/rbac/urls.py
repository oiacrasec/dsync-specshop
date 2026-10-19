from django.urls import path

from apps.core.routers import SchemaRouter
from apps.rbac.views import MyOrganizationsView, MyPermissionsView, PermissionCatalogView, ProfileViewSet

app_name = 'rbac'

router = SchemaRouter(use_regex_path=False)
router.register('profiles', ProfileViewSet, basename='profile')

urlpatterns = [
    path('me/organizations/', MyOrganizationsView.as_view(), name='my-organizations'),
    path('me/permissions/', MyPermissionsView.as_view(), name='my-permissions'),
    path('permissions/', PermissionCatalogView.as_view(), name='permission-catalog'),
    *router.urls,
]
