import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, concatMap, map, throwError } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url';
import { AuthSessionService } from '../services/auth-session.service';
import { UserContextService } from '../services/user-context.service';
import { PUBLIC_AUTH_PATHS, apiPath, needsOrganizationHeader } from '../utils/api-url';
import { apiProblem } from '../utils/api-problem';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const baseUrl = inject(API_BASE_URL);
    const session = inject(AuthSessionService);
    const contexts = inject(UserContextService);
    const path = apiPath(req.url, baseUrl);

    if (!path || PUBLIC_AUTH_PATHS.includes(path)) {
        return next(req);
    }

    const revision = session.getRevision();
    const organization = contexts.getActiveContext()?.organization_public_id;

    const assertCurrentContext = () => {
        if (revision !== session.getRevision() || organization !== contexts.getActiveContext()?.organization_public_id) {
            throw new Error('A sessão ou organização mudou durante a requisição.');
        }
    };

    const withCredentials = (token: string | null) => {
        assertCurrentContext();

        let headers = req.headers.delete('Authorization').delete('X-Contrato-Id').delete('X-Organizacao-Id').delete('X-Organization-Id');

        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }

        if (token && organization && needsOrganizationHeader(path, !!session.getUser()?.is_superuser)) {
            headers = headers.set('X-Organization-Id', organization);
        }

        return req.clone({ headers });
    };

    return session.ensureAccessToken().pipe(
        concatMap((token) =>
            next(withCredentials(token)).pipe(
                catchError((error) => {
                    if (!(error instanceof HttpErrorResponse) || apiProblem(error)?.type !== 'urn:dsync:problem:authentication-required' || !token || revision !== session.getRevision()) {
                        return throwError(() => error);
                    }

                    // Outra chamada pode ter renovado enquanto esta recebia o 401.
                    const renewal$ = session.getAccessToken() !== token ? session.ensureAccessToken() : session.refreshAccessToken().pipe(concatMap(() => session.ensureAccessToken()));

                    // next() aqui não repassa pelo catch acima: no máximo uma repetição.
                    return renewal$.pipe(concatMap((freshToken) => next(withCredentials(freshToken))));
                })
            )
        ),
        map((event) => {
            assertCurrentContext();

            return event;
        })
    );
};
