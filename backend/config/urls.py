"""Rotas raiz do backend."""

from django.urls import include, path, re_path

from apps.core.views import api_not_found

urlpatterns = [
    path('api/v1/', include('config.api.v1')),
    re_path(r'^api(?:/.*)?$', api_not_found),
]
