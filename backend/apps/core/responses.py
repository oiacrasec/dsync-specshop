"""Respostas de actions customizadas, usando o contrato HTTP existente do Core."""

from rest_framework import status
from rest_framework.response import Response

from .problems import exception_handler


def build_result_response(result=None, *, status_code=status.HTTP_200_OK):
    return Response(result, status=status_code)


def build_exception_response(*, exception, request):
    """Preserva RFC 9457, rollback, headers e logging seguro do handler global."""
    response = exception_handler(exception, {'request': request})
    response.exception = True
    return response
