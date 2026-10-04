import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { PaginatedResponse } from '@/app/types/pagination';
import { Workspace, WorkspaceCreate, WorkspaceUpdate } from '@/app/types/workspace';

export interface WorkspaceQuery {
    page?: number;
    rows?: number;
    first?: number;
    nome?: string;
    geoserver?: number;
    ativo?: boolean;
    ordering?: string;
    id?: number;
    id__in?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService extends BaseCrudService {
    list(query: WorkspaceQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<PaginatedResponse<Workspace>>(`${this.baseUrl}/mapa/workspace/`, { params });
    }

    get(id: number) {
        return this.http.get<Workspace>(`${this.baseUrl}/mapa/workspace/${id}/`);
    }

    create(payload: WorkspaceCreate) {
        return this.http.post<Workspace>(`${this.baseUrl}/mapa/workspace/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: WorkspaceUpdate) {
        return this.http.patch<Workspace>(`${this.baseUrl}/mapa/workspace/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/mapa/workspace/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }

    options(query: UiLookupQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<UiLookupOptionsResponse>(`${this.baseUrl}/mapa/workspace/options/`, { params });
    }
}
