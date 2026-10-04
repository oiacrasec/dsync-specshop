import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

import { LoginResponse, LoginUser } from '../../types/auth';
import { UserContextService } from '@/app/core/services/user-context.service';

const ACCESS_TOKEN_KEY = 'dss_access_token';
const REFRESH_TOKEN_KEY = 'dss_refresh_token';
const ACCESS_EXPIRES_AT_KEY = 'dss_access_expires_at';
const REFRESH_EXPIRES_AT_KEY = 'dss_refresh_expires_at';
const USER_KEY = 'dss_user';
const PERMISSION_CONTEXT_KEY = 'dss_permission_context';

const TEN_MINUTES_MS = 10 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
    private messageService = inject(MessageService);
    private userContextService = inject(UserContextService);
    private warningTimeoutId: number | null = null;

    setSession(response: LoginResponse) {
        this.userContextService.clearActiveContext();
        localStorage.removeItem(PERMISSION_CONTEXT_KEY);

        const now = Date.now();
        const accessExpiresAt = now + response.access_expires_in * 1000;
        const refreshExpiresAt = now + response.refresh_expires_in * 1000;

        localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
        localStorage.setItem(ACCESS_EXPIRES_AT_KEY, String(accessExpiresAt));
        localStorage.setItem(REFRESH_EXPIRES_AT_KEY, String(refreshExpiresAt));
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));

        this.scheduleExpiryWarning(accessExpiresAt);
    }

    clearSession() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
        localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(PERMISSION_CONTEXT_KEY);
        this.userContextService.clearActiveContext();
        this.clearWarningTimeout();
    }

    getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    getUser(): LoginUser | null {
        const raw = localStorage.getItem(USER_KEY);

        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw) as LoginUser;
        } catch {
            return null;
        }
    }

    updateUser(partial: Partial<LoginUser>) {
        const current = this.getUser();

        if (!current) {
            return;
        }

        const next = { ...current, ...partial };

        localStorage.setItem(USER_KEY, JSON.stringify(next));
    }

    isAuthenticated() {
        const token = this.getAccessToken();
        const expiresAt = this.getAccessExpiresAt();

        if (!token || !expiresAt) {
            this.clearSession();

            return false;
        }

        if (Date.now() >= expiresAt) {
            this.clearSession();

            return false;
        }

        return true;
    }

    initExpiryWarning() {
        const expiresAt = this.getAccessExpiresAt();

        if (!expiresAt || Date.now() >= expiresAt) {
            return;
        }

        this.scheduleExpiryWarning(expiresAt);
    }

    private getAccessExpiresAt() {
        const raw = localStorage.getItem(ACCESS_EXPIRES_AT_KEY);

        if (!raw) {
            return null;
        }

        const value = Number(raw);

        return Number.isFinite(value) ? value : null;
    }

    private scheduleExpiryWarning(expiresAt: number) {
        this.clearWarningTimeout();
        const warningAt = expiresAt - TEN_MINUTES_MS;
        const delay = warningAt - Date.now();

        if (delay <= 0) {
            if (Date.now() < expiresAt) {
                this.showExpiryWarning();
            }

            return;
        }

        this.warningTimeoutId = window.setTimeout(() => {
            this.showExpiryWarning();
        }, delay);
    }

    private showExpiryWarning() {
        this.messageService.add({
            severity: 'warn',
            summary: 'Sessao prestes a expirar',
            detail: 'Seu acesso expira em menos de 10 minutos.'
        });
    }

    private clearWarningTimeout() {
        if (this.warningTimeoutId !== null) {
            clearTimeout(this.warningTimeoutId);
            this.warningTimeoutId = null;
        }
    }
}
