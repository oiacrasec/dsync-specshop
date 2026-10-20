"""Paginação first/rows do ADR 0004, com erros RFC 9457."""

from rest_framework.pagination import BasePagination
from rest_framework.response import Response

from .serializers import PageQuerySerializer


class StandardResultsSetPagination(BasePagination):
    def paginate_queryset(self, queryset, request, view=None):
        query = PageQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        first = query.validated_data['first']
        rows = query.validated_data['rows']
        self.total_records = queryset.count()
        return list(queryset[first : first + rows])

    def get_paginated_response(self, data):
        return Response({'data': data, 'total_records': self.total_records})

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {'data': schema, 'total_records': {'type': 'integer'}},
            'required': ['data', 'total_records'],
        }

    def get_schema_operation_parameters(self, view):
        return [
            {'name': 'first', 'in': 'query', 'required': False, 'schema': {'type': 'integer', 'minimum': 0}},
            {'name': 'rows', 'in': 'query', 'required': False, 'schema': {'type': 'integer', 'minimum': 1}},
        ]
