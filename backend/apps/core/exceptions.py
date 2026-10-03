"""Erros da API no contrato RFC 9457 (ADR 0004)."""

import logging
from http import HTTPStatus
from traceback import extract_tb

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import SuspiciousOperation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import Http404, JsonResponse
from django.utils.translation import gettext_lazy as _
from rest_framework import exceptions
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.views import set_rollback

from .request_id import request_id_context

logger = logging.getLogger(__name__)
PROBLEM_CONTENT_TYPE = 'application/problem+json'


class ProblemException(exceptions.APIException):
    status_code = 500
    problem_type = 'about:blank'
    title = _('Erro interno do servidor')
    default_detail = _('Não foi possível concluir a requisição.')


class ContextInvalidRequest(ProblemException):
    status_code = 400
    problem_type = 'urn:datasync:problem:context-invalid-request'
    title = _('Contexto de organização inválido')
    default_detail = _('Informe uma organização válida no header X-Organization-Id.')


class ContextForbidden(ProblemException):
    status_code = 403
    problem_type = 'urn:datasync:problem:context-forbidden'
    title = _('Sem acesso à organização')
    default_detail = _('Você não tem acesso à organização selecionada.')


class ContractInactive(ProblemException):
    status_code = 403
    problem_type = 'urn:datasync:problem:contract-inactive'
    title = _('Contrato indisponível')
    default_detail = _('O contrato está vencido ou desativado.')


class LicenseLimitReached(ProblemException):
    status_code = 409
    problem_type = 'urn:datasync:problem:license-limit-reached'
    title = _('Limite de licenças atingido')
    default_detail = _('O contrato não possui licenças disponíveis para cadastrar outro usuário.')


class ProfileInUse(ProblemException):
    status_code = 409
    problem_type = 'urn:datasync:problem:profile-in-use'
    title = _('Perfil em uso')
    default_detail = _('Remova as atribuições do perfil antes de excluí-lo.')


class LastContractAdmin(ProblemException):
    status_code = 409
    problem_type = 'urn:datasync:problem:last-contract-admin'
    title = _('Último administrador do contrato')
    default_detail = _('O contrato precisa manter pelo menos um administrador.')


# Mensagens estáveis; não repassar texto de exceções de infraestrutura ao cliente.
HTTP_PROBLEMS = {
    400: ('malformed-request', _('Requisição malformada'), _('Verifique a sintaxe da requisição.')),
    401: (
        'authentication-required',
        _('Autenticação necessária'),
        _('Informe credenciais válidas para acessar este recurso.'),
    ),
    403: (
        'permission-denied',
        _('Acesso negado'),
        _('Você não tem permissão para acessar este recurso.'),
    ),
    404: ('not-found', _('Recurso não encontrado'), _('O recurso solicitado não foi encontrado.')),
    422: ('validation-error', _('Dados inválidos'), _('Corrija os campos indicados em errors.')),
}


def problem_data(request, status_code, *, problem_type=None, title=None, detail=None, errors=None):
    if status_code >= 500:
        problem_type = 'about:blank'
        title = _('Erro interno do servidor')
        detail = _('Não foi possível concluir a requisição.')
    elif problem_type is None:
        definition = HTTP_PROBLEMS.get(status_code)
        if definition:
            slug, title, detail = definition
            problem_type = f'urn:datasync:problem:{slug}'
        else:
            problem_type = 'about:blank'
            # Tipos genéricos seguem a frase padrão do HTTP (RFC 9457).
            title = _(HTTPStatus(status_code).phrase)
            detail = _('A requisição não pôde ser atendida.')
    data = {
        'type': problem_type,
        'status': status_code,
        'title': str(title),
        'detail': str(detail),
        'instance': request.path,
        'request_id': getattr(request, 'request_id', request_id_context.get()),
    }
    if errors is not None and status_code == 422:
        data['errors'] = errors
    return data


def validation_errors(detail, path='', result=None):
    """Achata erros aninhados em campo → lista de mensagens."""
    if result is None:
        result = {}
    if isinstance(detail, dict):
        for key, value in detail.items():
            validation_errors(value, f'{path}.{key}' if path else str(key), result)
    elif isinstance(detail, (list, tuple)):
        for index, value in enumerate(detail):
            nested_path = f'{path}.{index}' if path else str(index)
            validation_errors(
                value, nested_path if isinstance(value, (dict, list)) else path, result
            )
    else:
        result.setdefault(path or 'non_field_errors', []).append(str(detail))
    return result


def log_internal_error(exc):
    # Só metadados da pilha; sem mensagem da exceção, variáveis locais ou payloads.
    frames = [(frame.filename, frame.lineno, frame.name) for frame in extract_tb(exc.__traceback__)]
    logger.error('Erro interno: %s; pilha: %s', type(exc).__name__, frames)


def exception_handler(exc, context):
    request = context['request']
    response = drf_exception_handler(exc, context)
    errors = None
    kwargs = {}
    if isinstance(exc, (exceptions.ValidationError, DjangoValidationError)):
        status_code = 422
        detail = (
            getattr(exc, 'message_dict', None) or exc.messages
            if isinstance(exc, DjangoValidationError)
            else exc.detail
        )
        errors = validation_errors(detail)
    elif isinstance(exc, (exceptions.NotAuthenticated, exceptions.AuthenticationFailed)):
        status_code = 401
    elif isinstance(exc, ProblemException):
        status_code = exc.status_code
        kwargs = {'problem_type': exc.problem_type, 'title': exc.title, 'detail': exc.detail}
    elif isinstance(exc, (Http404, exceptions.NotFound)):
        status_code = 404
    elif isinstance(exc, (DjangoPermissionDenied, exceptions.PermissionDenied)):
        status_code = 403
    elif isinstance(exc, SuspiciousOperation):
        status_code = 400
    elif response is not None:
        status_code = response.status_code
    else:
        status_code = 500
    set_rollback()
    if status_code >= 500:
        log_internal_error(exc)
    headers = dict(response.items()) if response is not None else {}
    headers.pop('Content-Type', None)
    if status_code == 401:
        headers.setdefault('WWW-Authenticate', 'Bearer')
    data = problem_data(request, status_code, errors=errors, **kwargs)
    # Um erro continua sendo JSON mesmo se o cliente solicitar HTML.
    request.accepted_renderer = JSONRenderer()
    request.accepted_media_type = PROBLEM_CONTENT_TYPE
    response = Response(
        data, status=status_code, headers=headers, content_type=PROBLEM_CONTENT_TYPE
    )
    response.accepted_renderer = request.accepted_renderer
    response.accepted_media_type = request.accepted_media_type
    response.renderer_context = {'request': request}
    return response


def problem_http_response(request, status_code):
    return JsonResponse(
        problem_data(request, status_code), status=status_code, content_type=PROBLEM_CONTENT_TYPE
    )


@transaction.non_atomic_requests
def api_not_found(request):
    """Fallback de rotas: também evita a página de boas-vindas em DEBUG."""
    return problem_http_response(request, 404)
