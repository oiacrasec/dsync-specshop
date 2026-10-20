"""OpenAPI (ADR 0004): autenticação JWT, header de contexto e erros RFC 9457 no schema."""

from functools import lru_cache

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.generators import SchemaGenerator as BaseSchemaGenerator
from drf_spectacular.openapi import AutoSchema as BaseAutoSchema
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, inline_serializer
from rest_framework import serializers

from .constants import ORGANIZATION_HEADER
from .tenancy import system_context

ORGANIZATION_PARAMETER = OpenApiParameter(
    ORGANIZATION_HEADER,
    type=str,
    location=OpenApiParameter.HEADER,
    required=True,
    description='public_id da organização ativa (ADR 0006).',
)

OPTIONS_RESPONSE = inline_serializer(
    'OptionsResponse',
    {
        'data': inline_serializer(
            'Option', {'value': serializers.UUIDField(), 'label': serializers.CharField()}, many=True
        ),
        'total_records': serializers.IntegerField(),
        'has_next': serializers.BooleanField(),
    },
)
OPTIONS_PARAMETERS = [
    OpenApiParameter('q', str, description='Trecho do rótulo (até 255 caracteres).'),
    OpenApiParameter('first', int),
    OpenApiParameter('rows', int, description='1 a 100.'),
    OpenApiParameter('public_id', OpenApiTypes.UUID, many=True, description='Resolve rótulos; ignora `q`.'),
]
TABLE_SCHEMA_RESPONSE = inline_serializer(
    'TableSchema',
    {
        'columns': serializers.ListField(child=serializers.DictField()),
        'filters': serializers.ListField(child=serializers.DictField()),
        'general_search': serializers.DictField(allow_null=True),
        'ordering_fields': serializers.ListField(child=serializers.CharField()),
    },
)


def temporary_password_response(name, user_serializer):
    """Resposta com a senha temporária exibida uma única vez."""
    return inline_serializer(name, {'user': user_serializer, 'temporary_password': serializers.CharField()})


def page_of(name, item_serializer):
    return inline_serializer(name, {'data': item_serializer, 'total_records': serializers.IntegerField()})


PROBLEM_SCHEMA = {
    'type': 'object',
    'description': 'Problem Details (RFC 9457); `type` é urn:datasync:problem:<slug>.',
    'properties': {
        'type': {'type': 'string'},
        'title': {'type': 'string'},
        'status': {'type': 'integer'},
        'detail': {'type': 'string'},
        'instance': {'type': 'string'},
        'request_id': {'type': 'string'},
        'errors': {'type': 'object', 'additionalProperties': {'type': 'array', 'items': {'type': 'string'}}},
    },
    'required': ['type', 'title', 'status'],
}
PROBLEM_DESCRIPTIONS = {
    '400': 'Requisição malformada ou header de contexto inválido.',
    '401': 'Sem autenticação válida.',
    '403': 'Sem permissão ou sem acesso à organização.',
    '404': 'Recurso inexistente ou fora do contrato.',
    '409': 'Conflito de estado.',
    '422': 'Dados inválidos (`errors` por campo).',
}
WRITE_METHODS = {'post', 'put', 'patch'}


class SchemaGenerator(BaseSchemaGenerator):
    """Gera fora do contexto da requisição: só lê metadados (os filtros usam `manager.none()`)."""

    def get_schema(self, request=None, public=False):
        with system_context():
            return super().get_schema(request=request, public=public)


class AutoSchema(BaseAutoSchema):
    """Acrescenta X-Organization-Id às views que exigem a organização ativa."""

    def get_override_parameters(self):
        parameters = super().get_override_parameters()
        if getattr(self.view, 'organization_header', None) is not False and self._needs_organization():
            parameters = [*parameters, ORGANIZATION_PARAMETER]
        return parameters

    def _needs_organization(self):
        from apps.rbac.permissions import RequiredPermission

        if getattr(self.view, 'organization_header', False):
            return True
        return any(isinstance(permission, RequiredPermission) for permission in self.view.get_permissions()) and not (
            self.path.startswith('/api/v1/admin/')
        )


class JWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'apps.users.authentication.JWTAuthentication'
    name = 'jwt'

    def get_security_definition(self, auto_schema):
        return {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'}


def add_problem_responses(result, generator, request, public):
    """Documenta os erros RFC 9457 comuns em cada operação, sem sobrescrever os declarados."""
    result.setdefault('components', {}).setdefault('schemas', {})['Problem'] = PROBLEM_SCHEMA
    problem = {'application/problem+json': {'schema': {'$ref': '#/components/schemas/Problem'}}}
    for path, operations in result.get('paths', {}).items():
        for method, operation in operations.items():
            codes = ['400', '401', '403'] if operation.get('security') != [{}] else ['400']
            if '{' in path:
                codes.append('404')
            if method in WRITE_METHODS:
                codes += ['409', '422']
            responses = operation.setdefault('responses', {})
            for code in codes:
                responses.setdefault(code, {'description': PROBLEM_DESCRIPTIONS[code], 'content': problem})
    return result


@lru_cache(maxsize=2)
def api_schema(*, include_admin):
    """Schema da v1, gerado uma vez por processo (muda só com deploy); sem `/admin/` para o cliente."""
    from django.urls import include, path

    from config.api import v1

    patterns = [item for item in v1.urlpatterns if include_admin or not str(item.pattern).startswith('admin/')]
    generator = SchemaGenerator(patterns=[path('api/v1/', include(patterns))])
    return generator.get_schema(request=None, public=True)
