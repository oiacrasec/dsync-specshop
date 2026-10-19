import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { TableQueryCacheService } from './table-query-cache.service';
import { ActiveUserContext, UserContextsResponse } from '@/app/types/context';
import { safeReturnPath } from '../utils/return-url';
import { CONTEXT_KEY, UUID_PATTERN } from '../utils/session-data';

interface StoredContext extends ActiveUserContext {
    user_public_id: string;
}

@Injectable({ providedIn: 'root' })
export class UserContextService {
    private authService = inject(AuthService);
    private tableQueryCache = inject(TableQueryCacheService);
    private activeContext = signal<StoredContext | null>(this.restoreContext());
    private userPublicId: string | null = null;

    constructor() {
        const synchronize = (event: StorageEvent) => {
            if (event.storageArea !== localStorage || (event.key !== CONTEXT_KEY && event.key !== null)) {
                return;
            }

            const current = this.activeContext();
            const latest = this.restoreContext();

            if (current?.organization_public_id === latest?.organization_public_id && current?.user_public_id === latest?.user_public_id) {
                this.activeContext.set(latest);

                return;
            }

            this.activeContext.set(latest?.user_public_id === this.userPublicId ? latest : null);
            this.tableQueryCache.clearAll();
            this.reloadPage();
        };

        window.addEventListener('storage', synchronize);
        inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', synchronize));
    }

    bindUser(publicId: string) {
        if (this.activeContext() && this.activeContext()?.user_public_id !== publicId) {
            this.clearActiveContext();
        }

        this.userPublicId = publicId;
    }

    loadAvailableContexts() {
        return this.authService.contexts();
    }

    setActiveContext(context: ActiveUserContext) {
        if (!this.userPublicId || !UUID_PATTERN.test(context.organization_public_id)) {
            throw new Error('Organização inválida.');
        }

        const value = { ...context, user_public_id: this.userPublicId };

        localStorage.setItem(CONTEXT_KEY, JSON.stringify(value));
        this.tableQueryCache.clearAll();
        this.activeContext.set(value);
    }

    syncActiveContextLabelsFromAvailableContexts(contexts: UserContextsResponse) {
        const active = this.activeContext();

        if (!active) {
            return;
        }

        const matched = contexts.find((organization) => organization.public_id === active.organization_public_id);

        if (!matched) {
            this.clearActiveContext();
        } else if (matched.name !== active.organization_name) {
            this.setActiveContext({ organization_public_id: matched.public_id, organization_name: matched.name });
        }
    }

    getActiveContext(): ActiveUserContext | null {
        return this.activeContext();
    }

    hasActiveContext() {
        return this.activeContext() !== null;
    }

    clearActiveContext() {
        this.activeContext.set(null);
        localStorage.removeItem(CONTEXT_KEY);
        this.tableQueryCache.clearAll();
    }

    reloadPage() {
        window.location.reload();
    }

    invalidateCachedQueries() {
        this.tableQueryCache.clearAll();
    }

    openContext(returnUrl: string | null) {
        window.location.assign(safeReturnPath(returnUrl, window.location.origin));
    }

    private restoreContext(): StoredContext | null {
        try {
            const value = JSON.parse(localStorage.getItem(CONTEXT_KEY) ?? 'null');

            if (
                value &&
                typeof value.organization_public_id === 'string' &&
                UUID_PATTERN.test(value.organization_public_id) &&
                typeof value.user_public_id === 'string' &&
                UUID_PATTERN.test(value.user_public_id) &&
                typeof value.organization_name === 'string'
            ) {
                return value;
            }
        } catch {
            // Estado local inválido nunca fornece contexto à API.
        }

        return null;
    }
}
