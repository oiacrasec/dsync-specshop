import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_BASE_URL } from '../tokens/api-base-url';
import { FirstAccessPasswordChangeRequest, FirstAccessPasswordChangeResponse, LoginRequest, LoginResponse, TokenRefreshRequest, TokenRefreshResponse, TokenVerifyRequest } from '../../types/auth';
import { UserContextsResponse } from '../../types/context';
import { PermissionContextResponse } from '@/app/types/permission';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private baseUrl = inject(API_BASE_URL);

    login(payload: LoginRequest) {
        return this.http.post<LoginResponse>(`${this.baseUrl}/autenticacao/token/`, payload);
    }

    refresh(payload: TokenRefreshRequest) {
        return this.http.post<TokenRefreshResponse>(`${this.baseUrl}/autenticacao/token/refresh/`, payload);
    }

    verify(payload: TokenVerifyRequest) {
        return this.http.post<Record<string, never>>(`${this.baseUrl}/autenticacao/token/verify/`, payload);
    }

    contexts() {
        return this.http.get<UserContextsResponse>(`${this.baseUrl}/autenticacao/contextos/`, {
            params: { _ts: Date.now() }
        });
    }

    permissionsContext() {
        return this.http.get<PermissionContextResponse>(`${this.baseUrl}/autorizacao/permissoes-contexto/`);
    }

    firstAccessChangePassword(payload: FirstAccessPasswordChangeRequest) {
        return this.http.post<FirstAccessPasswordChangeResponse>(`${this.baseUrl}/autenticacao/primeiro-acesso/trocar-senha/`, payload);
    }
}
