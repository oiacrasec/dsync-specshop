import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { PaginatedResponse } from '@/app/types/pagination';
import { Store, StoreCreate, StoreEnsureSchemaPayload, StoreEnsureSchemaResponse, StoreUpdate } from '@/app/types/store';

export interface StoreQuery {
    page?: number;
    rows?: number;
    first?: number;
    nome?: string;
    workspace?: number;
    geoserver?: number;
    banco_geoespacial?: number;
    tipo?: string;
    host?: string;
    banco?: string;
    schema_name?: string;
    usuario?: string;
    ativo?: boolean;
    ordering?: string;
    id?: number;
    id__in?: string;
}

@Injectable({ providedIn: 'root' })
export class StoreService extends BaseCrudService {
    list(query: StoreQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<PaginatedResponse<Store>>(`${this.baseUrl}/mapa/store/`, { params });
    }

    get(id: number) {
        return this.http.get<Store>(`${this.baseUrl}/mapa/store/${id}/`);
    }

    create(payload: StoreCreate) {
        return this.http.post<Store>(`${this.baseUrl}/mapa/store/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: StoreUpdate) {
        return this.http.patch<Store>(`${this.baseUrl}/mapa/store/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/mapa/store/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }

    ensureSchema(payload: StoreEnsureSchemaPayload) {
        return this.http.post<StoreEnsureSchemaResponse>(`${this.baseUrl}/mapa/store/ensure-schema/`, payload);
    }

    options(query: UiLookupQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<UiLookupOptionsResponse>(`${this.baseUrl}/mapa/store/options/`, { params });
    }
}
