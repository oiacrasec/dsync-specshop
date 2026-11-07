"""Apps e rotas do projeto derivado entram pelos arquivos do projeto (ADR 0036, item 5).

Só a ligação é verificada: em cada projeto derivado esses arquivos têm conteúdo próprio.
"""

from django.conf import settings

from config import project
from config.api import project as project_api
from config.api import v1


def test_project_apps_are_installed_after_the_core_apps():
    installed = list(settings.INSTALLED_APPS)
    assert installed[len(installed) - len(project.PROJECT_APPS) :] == project.PROJECT_APPS


def test_project_routes_are_part_of_api_v1():
    assert all(pattern in v1.urlpatterns for pattern in project_api.urlpatterns)
