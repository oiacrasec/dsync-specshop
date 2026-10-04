import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { BancoGeoespacial, BancoGeoespacialCreate, BancoGeoespacialTestConnectionPayload, BancoGeoespacialUpdate } from '@/app/types/banco-geoespacial';
import { PaginatedResponse } from '@/app/types/pagination';

export interface BancoGeoespacialQuery {
    page?: number;
    rows?: number;
    first?: number;
    nome?: string;
    host?: string;
    database_name?: string;
    usuario?: string;
    ativo?: boolean;
    ordering?: string;
    id?: number;
    id__in?: string;
}

@Injectable({ providedIn: 'root' })
export class BancoGeoespacialService extends BaseCrudService {
    list(query: BancoGeoespacialQuery = {}) {
        const params = this.buildParams(query);
        return this.http.get<PaginatedResponse<BancoGeoespacial>>(`${this.baseUrl}/mapa/banco/`, { params });
    }

    get(id: number) {
        return this.http.get<BancoGeoespacial>(`${this.baseUrl}/mapa/banco/${id}/`);
    }

    create(payload: BancoGeoespacialCreate) {
        return this.http.post<BancoGeoespacial>(`${this.baseUrl}/mapa/banco/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: BancoGeoespacialUpdate) {
        return this.http.patch<BancoGeoespacial>(`${this.baseUrl}/mapa/banco/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/mapa/banco/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }

    options(query: UiLookupQuery = {}) {
        const params = this.buildParams(query);
        return this.http.get<UiLookupOptionsResponse>(`${this.baseUrl}/mapa/banco/options/`, { params });
    }

    testConnection(payload: BancoGeoespacialTestConnectionPayload) {
        return this.http.post<{ detail: string }>(`${this.baseUrl}/mapa/banco/test-connection/`, payload);
    }
}
