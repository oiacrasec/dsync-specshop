"""Correlação e erros que ocorrem fora de uma view do DRF."""

import logging
from uuid import uuid7

from .exceptions import PROBLEM_CONTENT_TYPE, exception_handler, problem_http_response
from .log_filters import request_id_context

logger = logging.getLogger(__name__)


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = str(uuid7())
        token = request_id_context.set(request.request_id)
        try:
            response = self.get_response(request)
            if request.path_info.startswith('/api/') and response.status_code >= 400:
                if response.get('Content-Type', '').split(';')[0] != PROBLEM_CONTENT_TYPE:
                    problem = problem_http_response(request, response.status_code)
                    # Conserva headers de protocolo e segurança, sem metadados do corpo antigo.
                    for key, value in response.items():
                        if key.lower() not in {
                            'content-type',
                            'content-length',
                            'content-encoding',
                            'etag',
                            'content-md5',
                        }:
                            problem[key] = value
                    problem.cookies = response.cookies
                    response = problem
            response['X-Request-Id'] = request.request_id
            if response.status_code >= 400:
                level = logging.ERROR if response.status_code >= 500 else logging.WARNING
                logger.log(level, 'Requisição com erro: status=%s', response.status_code)
            return response
        finally:
            request_id_context.reset(token)

    def process_exception(self, request, exception):
        if request.path_info.startswith('/api/'):
            return exception_handler(exception, {'request': request})
        return None
