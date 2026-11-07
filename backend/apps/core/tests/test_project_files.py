"""Apps e rotas do projeto derivado entram pelos arquivos do projeto (ADR 0036, item 5).

Só a ligação é verificada: em cada projeto derivado esses arquivos têm conteúdo próprio.
"""

from django.conf import settings

from config import project
from config.api import project as project_api
from config.api import v1
from config.settings.base import LOCAL_APPS


def test_project_apps_are_installed_after_the_core_apps():
    # Settings de ambiente (ex.: testing) podem acrescentar apps depois; só a ordem relativa importa.
    installed = list(settings.INSTALLED_APPS)
    last_core_app = max(installed.index(app) for app in LOCAL_APPS)
    assert all(installed.index(app) > last_core_app for app in project.PROJECT_APPS)


def test_project_routes_are_part_of_api_v1():
    assert all(pattern in v1.urlpatterns for pattern in project_api.urlpatterns)
