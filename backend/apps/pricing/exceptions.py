from django.utils.translation import gettext_lazy as _

from apps.core.exceptions import ProblemException


class SearchItemNotRunnable(ProblemException):
    status_code = 409
    problem_type = 'urn:dsync:problem:search-item-not-runnable'
    title = _('Pesquisa já executada')
    default_detail = _('Este produto já foi pesquisado ou está em pesquisa; tente de novo só após falha.')
