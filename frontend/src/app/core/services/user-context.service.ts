import { Injectable, inject } from '@angular/core';

import { AuthService } from '@/app/core/services/auth.service';
import { TableQueryCacheService } from '@/app/core/services/table-query-cache.service';
import { ActiveUserContext, UserContextsResponse } from '@/app/types/context';

const ACTIVE_CONTEXT_KEY = 'dss_active_context';

@Injectable({ providedIn: 'root' })
export class UserContextService {
    private authService = inject(AuthService);
    private tableQueryCache = inject(TableQueryCacheService);

    loadAvailableContexts() {
        return this.authService.contexts();
    }

    setActiveContext(context: ActiveUserContext) {
        this.persistActiveContext(context, true);
    }

    syncActiveContextLabelsFromAvailableContexts(contexts: UserContextsResponse) {
        const activeContext = this.getActiveContext();
        if (!activeContext || !contexts.contrato) {
            return;
        }
        if (activeContext.contrato_id !== contexts.contrato.id) {
            return;
        }

        const matchedOrganization = contexts.organizacoes.find((organization) => organization.id === activeContext.organizacao_id);
        if (!matchedOrganization) {
            return;
        }

        const nextContext: ActiveUserContext = {
            ...activeContext,
            contrato_nome: contexts.contrato.nome,
            organizacao_nome: matchedOrganization.nome
        };

        const shouldUpdate = nextContext.contrato_nome !== activeContext.contrato_nome || nextContext.organizacao_nome !== activeContext.organizacao_nome;

        if (!shouldUpdate) {
            return;
        }

        this.persistActiveContext(nextContext, false);
    }

    updateActiveOrganizationName(organizationId: number, organizationName: string) {
        const activeContext = this.getActiveContext();
        if (!activeContext || activeContext.organizacao_id !== organizationId) {
            return;
        }

        const normalizedName = (organizationName ?? '').trim();
        if (!normalizedName || normalizedName === activeContext.organizacao_nome) {
            return;
        }

        this.persistActiveContext(
            {
                ...activeContext,
                organizacao_nome: normalizedName
            },
            false
        );
    }

    updateActiveContractName(contractId: number, contractName: string) {
        const activeContext = this.getActiveContext();
        if (!activeContext || activeContext.contrato_id !== contractId) {
            return;
        }

        const normalizedName = (contractName ?? '').trim();
        if (!normalizedName || normalizedName === activeContext.contrato_nome) {
            return;
        }

        this.persistActiveContext(
            {
                ...activeContext,
                contrato_nome: normalizedName
            },
            false
        );
    }

    getActiveContext(): ActiveUserContext | null {
        const raw = localStorage.getItem(ACTIVE_CONTEXT_KEY);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as ActiveUserContext;
            if (Number.isFinite(parsed.contrato_id) && Number.isFinite(parsed.organizacao_id) && typeof parsed.contrato_nome === 'string' && typeof parsed.organizacao_nome === 'string') {
                return parsed;
            }
            return null;
        } catch {
            return null;
        }
    }

    hasActiveContext() {
        return !!this.getActiveContext();
    }

    clearActiveContext() {
        localStorage.removeItem(ACTIVE_CONTEXT_KEY);
        this.tableQueryCache.clearAll();
    }

    isOrganizationAvailable(contexts: UserContextsResponse, organizationId: number) {
        return contexts.organizacoes.some((organization) => organization.id === organizationId);
    }

    private persistActiveContext(context: ActiveUserContext, clearTableQueryCache: boolean) {
        localStorage.setItem(ACTIVE_CONTEXT_KEY, JSON.stringify(context));
        if (clearTableQueryCache) {
            this.tableQueryCache.clearAll();
        }
    }
}
