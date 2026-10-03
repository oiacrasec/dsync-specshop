import logging
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import UUID

import pytest
from django.http import HttpResponse
from django.test import RequestFactory

from apps.core.log_filters import RequestIdFilter, request_id_context
from apps.core.middleware import RequestIdMiddleware


def test_concurrent_requests_keep_separate_ids():
    barrier = Barrier(2)

    def get_response(request):
        barrier.wait(timeout=5)
        assert request_id_context.get() == request.request_id
        return HttpResponse()

    middleware = RequestIdMiddleware(get_response)

    def make_request():
        response = middleware(RequestFactory().get('/api/v1/example/'))
        assert request_id_context.get() == '-'
        return response['X-Request-Id']

    with ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(lambda _: make_request(), range(2)))

    assert len(set(ids)) == 2
    assert all(UUID(value).version == 7 for value in ids)


def test_context_resets_even_when_response_generation_fails(rf):
    def fail(request):
        raise RuntimeError('falha simulada')

    with pytest.raises(RuntimeError, match='falha simulada'):
        RequestIdMiddleware(fail)(rf.get('/api/v1/example/'))

    assert request_id_context.get() == '-'


def test_log_filter_uses_request_after_context_has_reset(rf):
    request = rf.get('/api/v1/example/')
    request.request_id = '019a0000-0000-7000-8000-000000000001'
    record = logging.LogRecord('django.request', logging.ERROR, __file__, 1, 'erro', (), None)
    record.request = request

    assert RequestIdFilter().filter(record)
    assert record.request_id == request.request_id
