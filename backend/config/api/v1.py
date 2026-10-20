"""Rotas da API v1."""

from django.urls import URLPattern, URLResolver, include, path

from apps.core.views import MediaFileView, OpenApiSchemaView

urlpatterns: list[URLPattern | URLResolver] = [
    path('admin/', include('apps.administration.urls')),
    path('', include('apps.users.urls')),
    path('', include('apps.contracts.urls')),
    path('', include('apps.rbac.urls')),
    path('schema/', OpenApiSchemaView.as_view(), name='openapi-schema'),
    path('media/<str:token>/', MediaFileView.as_view(), name='media-file'),
]
