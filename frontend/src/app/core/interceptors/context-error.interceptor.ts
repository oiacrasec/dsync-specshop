import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url';
import { AuthSessionService } from '../services/auth-session.service';
import { UserContextService } from '../services/user-context.service';
import { apiPath } from '../utils/api-url';
import { apiProblem } from '../utils/api-problem';

export const contextErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const baseUrl = inject(API_BASE_URL);
    const router = inject(Router);
    const messages = inject(MessageService);
    const session = inject(AuthSessionService);
    const contexts = inject(UserContextService);
    const revision = session.getRevision();
    const organization = contexts.getActiveContext()?.organization_public_id;
    const hadSession = !!session.getUser();
    const path = apiPath(req.url, baseUrl);

    return next(req).pipe(
        catchError((error) => {
            const problem = apiProblem(error);

            if (!path || !problem || !hadSession || ['/auth/login/', '/auth/logout/'].includes(path)) {
                return throwError(() => error);
            }

            // Uma resposta da sessão/contexto anterior não pode alterar a sessão nova.
            if (revision !== session.getRevision() || organization !== contexts.getActiveContext()?.organization_public_id) {
                return throwError(() => error);
            }

            if (problem.type === 'urn:dsync:problem:authentication-required' || problem.type === 'urn:dsync:problem:contract-inactive') {
                session.clearSession();

                if (!router.url.startsWith('/landing/login')) {
                    void router.navigateByUrl('/landing/login');
                }
            } else if (problem.type === 'urn:dsync:problem:password-change-required' && !session.getUser()?.is_superuser) {
                session.updateUser({ must_change_password: true });
                contexts.clearActiveContext();

                if (!router.url.startsWith('/primeiro-acesso/trocar-senha')) {
                    void router.navigateByUrl('/primeiro-acesso/trocar-senha');
                }
            } else if (['urn:dsync:problem:context-invalid-request', 'urn:dsync:problem:context-forbidden'].includes(problem.type) && !session.getUser()?.is_superuser) {
                contexts.clearActiveContext();

                if (!router.url.startsWith('/contexto/selecao')) {
                    void router.navigate(['/contexto/selecao'], { queryParams: { returnUrl: router.url } });
                    messages.add({ severity: 'warn', summary: 'Contexto de trabalho', detail: 'Selecione novamente a organização para continuar.' });
                }
            }

            return throwError(() => error);
        })
    );
};
