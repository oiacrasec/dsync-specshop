import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_BASE_URL } from '../tokens/api-base-url';
import { AuthSessionService } from '../services/auth-session.service';
import { UserContextService } from '../services/user-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const baseUrl = inject(API_BASE_URL);
    const session = inject(AuthSessionService);
    const userContextService = inject(UserContextService);
    const token = session.getAccessToken();
    const user = session.getUser();
    const isApiRequest = req.url.startsWith(baseUrl);
    const skipContextHeaders =
        req.url.includes('/autenticacao/token/') ||
        req.url.endsWith('/autenticacao/contextos/') ||
        req.url.endsWith('/autenticacao/primeiro-acesso/trocar-senha/');

    if (token && isApiRequest) {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`
        };

        if (!user?.is_superuser && !skipContextHeaders) {
            const context = userContextService.getActiveContext();
            if (context) {
                headers['X-Contrato-Id'] = String(context.contrato_id);
                headers['X-Organizacao-Id'] = String(context.organizacao_id);
            }
        }

        req = req.clone({
            setHeaders: headers
        });
    }

    return next(req);
};
