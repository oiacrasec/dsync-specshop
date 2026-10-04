import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map, of, throwError } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url';

interface ETagEntry {
    etag: string;
    body: unknown;
}

const etagCache = new Map<string, ETagEntry>();

export const etagInterceptor: HttpInterceptorFn = (req, next) => {
    const baseUrl = inject(API_BASE_URL);
    const isApiGet = req.method === 'GET' && req.url.startsWith(baseUrl);

    if (!isApiGet) {
        return next(req);
    }

    const key = req.urlWithParams;
    const cached = etagCache.get(key);
    const conditionalReq = cached ? req.clone({ setHeaders: { 'If-None-Match': cached.etag } }) : req;

    return next(conditionalReq).pipe(
        map((event) => {
            if (!(event instanceof HttpResponse)) {
                return event;
            }

            if (event.status === 304 && cached) {
                return event.clone({
                    status: 200,
                    statusText: 'OK',
                    body: cached.body
                });
            }

            if (event.status === 200) {
                const etag = event.headers.get('ETag');

                if (etag) {
                    etagCache.set(key, { etag, body: event.body });
                }
            }

            return event;
        }),
        catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 304 && cached) {
                return of(
                    new HttpResponse({
                        status: 200,
                        statusText: 'OK',
                        url: req.urlWithParams,
                        headers: error.headers,
                        body: cached.body
                    })
                );
            }

            return throwError(() => error);
        })
    );
};
