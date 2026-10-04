import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { PaginatedResponse } from '@/app/types/pagination';
import { Setor, SetorCreate, SetorUpdate } from '@/app/types/setor';

export interface SetorQuery {
    page?: number;
    rows?: number;
    first?: number;
    nome?: string;
    organizacao?: number;
    ativo?: boolean;
    ordering?: string;
    id?: number;
    id__in?: string;
}

@Injectable({ providedIn: 'root' })
export class SetorService extends BaseCrudService {
    list(query: SetorQuery = {}) {
        const params = this.buildParams(query);
        return this.http.get<PaginatedResponse<Setor>>(`${this.baseUrl}/administracao/setor/`, { params });
    }

    get(id: number) {
        return this.http.get<Setor>(`${this.baseUrl}/administracao/setor/${id}/`);
    }

    create(payload: SetorCreate) {
        return this.http.post<Setor>(`${this.baseUrl}/administracao/setor/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: SetorUpdate) {
        return this.http.patch<Setor>(`${this.baseUrl}/administracao/setor/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/administracao/setor/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }

    options(query: UiLookupQuery = {}) {
        const params = this.buildParams(query);
        return this.http.get<UiLookupOptionsResponse>(`${this.baseUrl}/administracao/setor/options/`, { params });
    }
}
