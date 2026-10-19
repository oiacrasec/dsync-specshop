"""Rotas da API v1."""

from django.urls import URLPattern, URLResolver, include, path

urlpatterns: list[URLPattern | URLResolver] = [
    path('admin/', include('apps.administration.urls')),
    path('auth/', include('apps.users.urls')),
    path('', include('apps.contracts.urls')),
    path('me/', include('apps.rbac.urls')),
]
