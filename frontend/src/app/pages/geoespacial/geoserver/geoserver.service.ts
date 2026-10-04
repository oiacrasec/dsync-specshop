import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { GeoServer, GeoServerCreate, GeoServerTestConnectionPayload, GeoServerUpdate } from '@/app/types/geoserver';
import { PaginatedResponse } from '@/app/types/pagination';

export interface GeoServerQuery {
    page?: number;
    rows?: number;
    first?: number;
    nome?: string;
    status?: string;
    base_url?: string;
    ativo?: boolean;
    ordering?: string;
    id?: number;
    id__in?: string;
}

@Injectable({ providedIn: 'root' })
export class GeoServerService extends BaseCrudService {
    list(query: GeoServerQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<PaginatedResponse<GeoServer>>(`${this.baseUrl}/mapa/geoserver/`, { params });
    }

    get(id: number) {
        return this.http.get<GeoServer>(`${this.baseUrl}/mapa/geoserver/${id}/`);
    }

    create(payload: GeoServerCreate) {
        return this.http.post<GeoServer>(`${this.baseUrl}/mapa/geoserver/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: GeoServerUpdate) {
        return this.http.patch<GeoServer>(`${this.baseUrl}/mapa/geoserver/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/mapa/geoserver/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }

    options(query: UiLookupQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<UiLookupOptionsResponse>(`${this.baseUrl}/mapa/geoserver/options/`, { params });
    }

    testConnection(payload: GeoServerTestConnectionPayload) {
        return this.http.post<{ detail: string }>(`${this.baseUrl}/mapa/geoserver/test-connection/`, payload);
    }
}
