from django.urls import path

from apps.rbac.views import MyOrganizationsView, MyPermissionsView

app_name = 'rbac'

urlpatterns = [
    path('organizations/', MyOrganizationsView.as_view(), name='my-organizations'),
    path('permissions/', MyPermissionsView.as_view(), name='my-permissions'),
]
