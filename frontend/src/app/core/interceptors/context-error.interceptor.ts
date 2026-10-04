import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url';
import { AuthSessionService } from '../services/auth-session.service';
import { PermissionContextService } from '../services/permission-context.service';
import { UserContextService } from '../services/user-context.service';

const CONTEXT_SELECTION_PATH = '/contexto/selecao';

export const contextErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const baseUrl = inject(API_BASE_URL);
    const router = inject(Router);
    const messageService = inject(MessageService);
    const authSessionService = inject(AuthSessionService);
    const userContextService = inject(UserContextService);
    const permissionContextService = inject(PermissionContextService);

    return next(req).pipe(
        catchError((error) => {
            if (!(error instanceof HttpErrorResponse)) {
                return throwError(() => error);
            }

            if (!req.url.startsWith(baseUrl) || !authSessionService.isAuthenticated()) {
                return throwError(() => error);
            }

            const user = authSessionService.getUser();
            if (user?.is_superuser) {
                return throwError(() => error);
            }

            const errorCode = error.error?.code;
            const isInvalidRequest = error.status === 400 && errorCode === 'context_invalid_request';
            const isForbidden = error.status === 403 && errorCode === 'context_forbidden';
            if (!isInvalidRequest && !isForbidden) {
                return throwError(() => error);
            }

            userContextService.clearActiveContext();
            permissionContextService.clearCache();

            if (!router.url.startsWith(CONTEXT_SELECTION_PATH)) {
                void router.navigate([CONTEXT_SELECTION_PATH], {
                    queryParams: { returnUrl: router.url }
                });
            }

            messageService.add({
                severity: isForbidden ? 'warn' : 'info',
                summary: 'Contexto de trabalho',
                detail: 'Selecione novamente a organização para continuar.'
            });

            return throwError(() => error);
        })
    );
};
