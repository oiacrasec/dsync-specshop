"""Correlação de logs isolada por contexto de execução."""

import logging
from contextvars import ContextVar

request_id_context: ContextVar[str] = ContextVar('request_id', default='-')


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        request = getattr(record, 'request', None)
        record.request_id = getattr(request, 'request_id', request_id_context.get())
        return True
