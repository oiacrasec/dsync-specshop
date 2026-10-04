import { Injectable, inject } from '@angular/core';
import { Observable, finalize, of, shareReplay, tap, throwError } from 'rxjs';

import { AuthService } from '@/app/core/services/auth.service';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { PermissionContextResponse } from '@/app/types/permission';

const PERMISSION_CONTEXT_KEY = 'dss_permission_context';

interface PermissionContextCacheEntry {
    user_uuid: string;
    context_key: string;
    payload: PermissionContextResponse;
    fetched_at: number;
}

@Injectable({ providedIn: 'root' })
export class PermissionContextService {
    private authService = inject(AuthService);
    private authSession = inject(AuthSessionService);
    private userContextService = inject(UserContextService);

    private snapshot: PermissionContextResponse | null = null;
    private snapshotKey: string | null = null;
    private inflightKey: string | null = null;
    private inflightRequest$: Observable<PermissionContextResponse> | null = null;

    loadForCurrentContext(forceRefresh = false): Observable<PermissionContextResponse> {
        const user = this.authSession.getUser();
        if (!user) {
            return throwError(() => new Error('permission_user_not_authenticated'));
        }

        const contextKey = this.buildContextKey();
        if (!contextKey) {
            return throwError(() => new Error('permission_context_required'));
        }

        if (!forceRefresh && this.snapshot && this.snapshotKey === contextKey) {
            return of(this.snapshot);
        }

        if (!forceRefresh) {
            const persisted = this.readPersisted();
            if (persisted && persisted.user_uuid === user.uuid && persisted.context_key === contextKey) {
                this.snapshot = persisted.payload;
                this.snapshotKey = contextKey;
                return of(persisted.payload);
            }
        }

        if (!forceRefresh && this.inflightRequest$ && this.inflightKey === contextKey) {
            return this.inflightRequest$;
        }

        this.inflightKey = contextKey;
        this.inflightRequest$ = this.authService.permissionsContext().pipe(
            tap((payload) => {
                const nextEntry: PermissionContextCacheEntry = {
                    user_uuid: user.uuid,
                    context_key: contextKey,
                    payload,
                    fetched_at: Date.now()
                };
                this.snapshot = payload;
                this.snapshotKey = contextKey;
                localStorage.setItem(PERMISSION_CONTEXT_KEY, JSON.stringify(nextEntry));
            }),
            finalize(() => {
                if (this.inflightKey === contextKey) {
                    this.inflightKey = null;
                    this.inflightRequest$ = null;
                }
            }),
            shareReplay(1)
        );

        return this.inflightRequest$;
    }

    refreshForCurrentContext() {
        return this.loadForCurrentContext(true);
    }

    clearCache() {
        this.snapshot = null;
        this.snapshotKey = null;
        this.inflightKey = null;
        this.inflightRequest$ = null;
        localStorage.removeItem(PERMISSION_CONTEXT_KEY);
    }

    getSnapshot(): PermissionContextResponse | null {
        const user = this.authSession.getUser();
        if (!user) {
            return null;
        }

        const contextKey = this.buildContextKey();
        if (!contextKey) {
            return null;
        }

        if (this.snapshot && this.snapshotKey === contextKey) {
            return this.snapshot;
        }

        const persisted = this.readPersisted();
        if (!persisted) {
            return null;
        }
        if (persisted.user_uuid !== user.uuid || persisted.context_key !== contextKey) {
            return null;
        }

        this.snapshot = persisted.payload;
        this.snapshotKey = contextKey;
        return persisted.payload;
    }

    hasPermission(permission: string) {
        const snapshot = this.getSnapshot();
        if (!snapshot) {
            return false;
        }
        if (snapshot.is_superuser) {
            return true;
        }
        return snapshot.permissoes.includes(permission);
    }

    hasAnyPermission(permissions: string[]) {
        if (permissions.length === 0) {
            return true;
        }
        return permissions.some((permission) => this.hasPermission(permission));
    }

    hasAllPermissions(permissions: string[]) {
        if (permissions.length === 0) {
            return true;
        }
        return permissions.every((permission) => this.hasPermission(permission));
    }

    private buildContextKey() {
        const user = this.authSession.getUser();
        if (!user) {
            return null;
        }

        if (user.is_superuser) {
            return `user:${user.uuid}:superuser`;
        }

        const context = this.userContextService.getActiveContext();
        if (!context) {
            return null;
        }

        return `user:${user.uuid}:contrato:${context.contrato_id}:organizacao:${context.organizacao_id}`;
    }

    private readPersisted(): PermissionContextCacheEntry | null {
        const raw = localStorage.getItem(PERMISSION_CONTEXT_KEY);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as PermissionContextCacheEntry;
            if (typeof parsed?.user_uuid === 'string' && typeof parsed?.context_key === 'string' && parsed?.payload && Array.isArray(parsed.payload.permissoes) && Array.isArray(parsed.payload.papeis_ativos)) {
                return parsed;
            }
            return null;
        } catch {
            return null;
        }
    }
}
