import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_BASE_URL } from '../tokens/api-base-url';
import { FirstAccessPasswordChangeRequest, FirstAccessPasswordChangeResponse, LoginRequest, LoginResponse, MfaLoginChallenge, MfaLoginRequest, TokenRefreshRequest, TokenRefreshResponse } from '../../types/auth';
import { UserContextsResponse } from '../../types/context';
import { apiEndpoint } from '../utils/api-url';
import { defer } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private baseUrl = inject(API_BASE_URL);

    login(payload: LoginRequest) {
        return defer(() => this.http.post<LoginResponse | MfaLoginChallenge>(apiEndpoint(this.baseUrl, '/auth/login/'), payload));
    }

    loginMfa(payload: MfaLoginRequest) {
        return defer(() => this.http.post<LoginResponse>(apiEndpoint(this.baseUrl, '/auth/login/mfa/'), payload));
    }

    refresh(payload: TokenRefreshRequest) {
        return defer(() => this.http.post<TokenRefreshResponse>(apiEndpoint(this.baseUrl, '/auth/refresh/'), payload));
    }

    logout(payload: TokenRefreshRequest) {
        return defer(() => this.http.post<void>(apiEndpoint(this.baseUrl, '/auth/logout/'), payload));
    }

    contexts() {
        return defer(() => this.http.get<UserContextsResponse>(apiEndpoint(this.baseUrl, '/me/organizations/')));
    }

    changePassword(payload: FirstAccessPasswordChangeRequest) {
        return defer(() => this.http.post<FirstAccessPasswordChangeResponse>(apiEndpoint(this.baseUrl, '/auth/change-password/'), payload));
    }
}
