"""Exceções da API no contrato RFC 9457 (ADR 0004).

As respostas são montadas por `apps.core.problems`.
"""

from django.utils.translation import gettext_lazy as _
from rest_framework import exceptions


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
