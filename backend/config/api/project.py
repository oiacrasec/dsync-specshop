"""Rotas da API v1 do projeto derivado (ADR 0036, item 5): arquivo do projeto, vazio no core.

Cada projeto derivado inclui aqui as rotas dos próprios apps; o core nunca altera este
arquivo e, em conflito de merge, vale a versão do projeto.
"""

from django.urls import URLPattern, URLResolver, include, path

urlpatterns: list[URLPattern | URLResolver] = [
    path('', include('apps.catalog.urls')),
]
