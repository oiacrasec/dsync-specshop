import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { GeoServerBanco, GeoServerBancoCreate, GeoServerBancoUpdate } from '@/app/types/geoserver-banco';
import { PaginatedResponse } from '@/app/types/pagination';

export interface GeoServerBancoQuery {
    page?: number;
    rows?: number;
    first?: number;
    q?: string;
    geoserver?: number;
    banco?: number;
    ativo?: boolean;
    ordering?: string;
    id?: number;
    id__in?: string;
}

@Injectable({ providedIn: 'root' })
export class GeoServerBancoService extends BaseCrudService {
    list(query: GeoServerBancoQuery = {}) {
        const params = this.buildParams(query);
        return this.http.get<PaginatedResponse<GeoServerBanco>>(`${this.baseUrl}/mapa/geoserverbanco/`, { params });
    }

    get(id: number) {
        return this.http.get<GeoServerBanco>(`${this.baseUrl}/mapa/geoserverbanco/${id}/`);
    }

    create(payload: GeoServerBancoCreate) {
        return this.http.post<GeoServerBanco>(`${this.baseUrl}/mapa/geoserverbanco/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: GeoServerBancoUpdate) {
        return this.http.patch<GeoServerBanco>(`${this.baseUrl}/mapa/geoserverbanco/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/mapa/geoserverbanco/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }
}
