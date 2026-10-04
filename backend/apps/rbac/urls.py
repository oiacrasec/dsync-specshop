from django.urls import path

from apps.rbac.views import MyOrganizationsView

app_name = 'rbac'

urlpatterns = [
    path('organizations/', MyOrganizationsView.as_view(), name='my-organizations'),
]
