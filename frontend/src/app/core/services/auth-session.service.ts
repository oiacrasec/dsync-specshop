import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, defer, finalize, firstValueFrom, map, of, shareReplay, throwError, timeout } from 'rxjs';
import { LoginResponse, LoginUser, TokenRefreshResponse } from '@/app/types/auth';
import { AuthService } from './auth.service';
import { UserContextService } from './user-context.service';
import { SESSION_KEY, isLoginUser, tokenExpiresAt } from '../utils/session-data';

interface SessionState extends LoginResponse {
    session_id: string;
    accessExpiresAt: number;
    refreshExpiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
    private authService = inject(AuthService);
    private contexts = inject(UserContextService);
    private router = inject(Router);
    private state = signal<SessionState | null>(null);
    private refreshRequest$: Observable<TokenRefreshResponse> | null = null;
    private revision = 0;

    constructor() {
        for (const key of ['dss_access_token', 'dss_refresh_token', 'dss_access_expires_at', 'dss_refresh_expires_at', 'dss_user', 'dss_active_context', 'dss_permission_context']) {
            localStorage.removeItem(key);
        }

        this.restoreSession();

        const synchronize = (event: StorageEvent) => {
            if (event.storageArea !== localStorage || (event.key !== SESSION_KEY && event.key !== null)) {
                return;
            }

            const previousSession = this.state()?.session_id;

            this.restoreSession();

            if (previousSession !== this.state()?.session_id) {
                this.contexts.reloadPage();
            } else if (this.getUser()?.must_change_password && !this.getUser()?.is_superuser) {
                this.contexts.clearActiveContext();
                void this.router.navigateByUrl('/primeiro-acesso/trocar-senha');
            }
        };

        window.addEventListener('storage', synchronize);
        inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', synchronize));
    }

    setSession(response: LoginResponse) {
        this.clearSession();
        this.store(response);
    }

    clearSession() {
        this.revision++;
        this.state.set(null);
        this.refreshRequest$ = null;
        localStorage.removeItem(SESSION_KEY);
        this.contexts.clearActiveContext();
    }

    getRevision() {
        return this.revision;
    }

    getAccessToken() {
        return this.state()?.access ?? null;
    }

    getUser(): LoginUser | null {
        return this.state()?.user ?? null;
    }

    updateUser(partial: Partial<LoginUser>) {
        // Outra aba pode ter rotacionado os tokens durante a troca de senha.
        this.restoreSession();
        const current = this.state();

        if (current) {
            this.store({ ...current, user: { ...current.user, ...partial } });
        }
    }

    isAuthenticated() {
        const current = this.state();

        if (!current) {
            return false;
        }

        if (Math.max(current.accessExpiresAt, current.refreshExpiresAt) <= Date.now()) {
            this.clearSession();

            return false;
        }

        return true;
    }

    ensureAccessToken(): Observable<string | null> {
        const current = this.state();

        if (!current || !this.isAuthenticated()) {
            return of(null);
        }

        if (current.accessExpiresAt > Date.now() + 5000) {
            return of(current.access);
        }

        return this.refreshAccessToken().pipe(map((tokens) => tokens.access));
    }

    refreshAccessToken(): Observable<TokenRefreshResponse> {
        if (this.refreshRequest$) {
            return this.refreshRequest$;
        }

        const current = this.state();
        const revision = this.revision;

        if (!current || current.refreshExpiresAt <= Date.now()) {
            this.clearSession();

            return throwError(() => new Error('Sessão expirada.'));
        }

        const request$ = defer(() =>
            this.withSessionLock(async () => {
                this.restoreSession();
                const latest = this.state();

                if (revision !== this.revision || !latest || latest.refreshExpiresAt <= Date.now()) {
                    throw new Error('A sessão mudou ou expirou.');
                }

                // Quem obteve o lock antes desta aba já pode ter renovado.
                if (latest.access !== current.access && latest.accessExpiresAt > Date.now() + 5000) {
                    return { access: latest.access, refresh: latest.refresh };
                }

                const tokens = await firstValueFrom(this.authService.refresh({ refresh: latest.refresh }).pipe(timeout(15000)));
                const persisted = this.readSession();

                if (revision !== this.revision || persisted?.refresh !== latest.refresh) {
                    throw new Error('A sessão mudou durante a renovação.');
                }

                this.store({ ...tokens, user: persisted.user });

                return tokens;
            })
        ).pipe(
            catchError((error) => {
                if (this.revision === revision && error instanceof HttpErrorResponse && error.status === 401) {
                    this.clearSession();
                    void this.router.navigateByUrl('/landing/login');
                }

                return throwError(() => error);
            }),
            finalize(() => {
                if (this.refreshRequest$ === request$) {
                    this.refreshRequest$ = null;
                }
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        this.refreshRequest$ = request$;

        return request$;
    }

    logout(): Observable<void> {
        const revision = this.revision;

        // Espera rotação em outra aba e revoga o refresh mais recente.
        return defer(() =>
            this.withSessionLock(async () => {
                if (revision !== this.revision) {
                    return;
                }

                const current = this.readSession();

                this.clearSession();

                if (current) {
                    await firstValueFrom(this.authService.logout({ refresh: current.refresh }).pipe(timeout(15000)));
                }
            })
        ).pipe(
            catchError((error) => {
                if (revision === this.revision) {
                    this.clearSession();
                }

                return throwError(() => error);
            })
        );
    }

    private async withSessionLock<T>(action: () => Promise<T>): Promise<T> {
        if (!navigator.locks) {
            return Promise.reject(new Error('Este navegador não suporta renovação segura entre abas. Entre novamente.'));
        }

        return await navigator.locks.request('dsc-auth-session', { signal: AbortSignal.timeout(20000) }, action);
    }

    private readSession(): SessionState | null {
        try {
            const value = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
            const accessExpiresAt = tokenExpiresAt(value?.access);
            const refreshExpiresAt = tokenExpiresAt(value?.refresh);

            if (isLoginUser(value?.user) && typeof value.session_id === 'string' && accessExpiresAt && refreshExpiresAt) {
                return { access: value.access, refresh: value.refresh, user: value.user, session_id: value.session_id, accessExpiresAt, refreshExpiresAt };
            }
        } catch {
            // Persistência malformada nunca autentica nem fornece contexto.
        }

        return null;
    }

    private restoreSession() {
        const current = this.readSession();

        if (!current || Math.max(current.accessExpiresAt, current.refreshExpiresAt) <= Date.now()) {
            this.clearSession();

            return;
        }

        if (this.state()?.session_id !== current.session_id) {
            this.revision++;
            this.contexts.invalidateCachedQueries();
        }

        this.contexts.bindUser(current.user.public_id);
        this.state.set(current);
    }

    private store(response: LoginResponse) {
        const accessExpiresAt = tokenExpiresAt(response.access);
        const refreshExpiresAt = tokenExpiresAt(response.refresh);

        if (!isLoginUser(response.user) || !accessExpiresAt || !refreshExpiresAt) {
            throw new Error('Resposta de autenticação inválida.');
        }

        const session_id = this.state()?.session_id ?? crypto.randomUUID();

        localStorage.setItem(SESSION_KEY, JSON.stringify({ access: response.access, refresh: response.refresh, user: response.user, session_id }));
        this.contexts.bindUser(response.user.public_id);
        this.state.set({ ...response, session_id, accessExpiresAt, refreshExpiresAt });
    }
}
