import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';

import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { apiEndpoint } from '@/app/core/utils/api-url';
import { PermissionSummary } from '@/app/types/permission';
import { AuthSessionService } from './auth-session.service';
import { UserContextService } from './user-context.service';

// Permissões efetivas na organização ativa, para menus e botões (ADR 0037). Uma busca por
// sessão + organização; nega por padrão enquanto não carregou. Quem autoriza é o backend.
@Injectable({ providedIn: 'root' })
export class PermissionContextService {
    private http = inject(HttpClient);
    private baseUrl = inject(API_BASE_URL);
    private session = inject(AuthSessionService);
    private contexts = inject(UserContextService);
    private permissions = signal<ReadonlySet<string>>(new Set());
    private cacheKey: string | null = null;
    private request$: Observable<ReadonlySet<string>> | null = null;

    loadForCurrentContext(): Observable<ReadonlySet<string>> {
        const organization = this.contexts.getActiveContext()?.organization_public_id;

        if (!organization || this.session.getUser()?.is_superuser) {
            this.clearCache();

            return of(this.permissions());
        }

        const key = `${this.session.getRevision()}|${organization}`;

        if (this.cacheKey !== key || !this.request$) {
            this.cacheKey = key;
            this.request$ = this.http.get<PermissionSummary>(apiEndpoint(this.baseUrl, '/me/permissions/')).pipe(
                map((summary) => new Set(summary.permissions) as ReadonlySet<string>),
                tap((permissions) => {
                    if (this.cacheKey === key) {
                        this.permissions.set(permissions);
                    }
                }),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }

        return this.request$;
    }

    refreshForCurrentContext() {
        this.cacheKey = null;

        return this.loadForCurrentContext();
    }

    clearCache() {
        this.cacheKey = null;
        this.request$ = null;
        this.permissions.set(new Set());
    }

    hasPermission(permission: string) {
        return this.permissions().has(permission);
    }

    hasAnyPermission(permissions: string[]) {
        return permissions.length === 0 || permissions.some((permission) => this.hasPermission(permission));
    }

    hasAllPermissions(permissions: string[]) {
        return permissions.every((permission) => this.hasPermission(permission));
    }
}
