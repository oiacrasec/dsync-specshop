import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { Organizacao, OrganizacaoCreate, OrganizacaoUpdate } from '@/app/types/organizacao';
import { PaginatedResponse } from '@/app/types/pagination';

export interface OrganizacaoQuery {
    page?: number;
    rows?: number;
    first?: number;
    nome?: string;
    cnpj?: string;
    contrato?: number;
    ativo?: boolean;
    ordering?: string;
    id?: number;
    id__in?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizacaoService extends BaseCrudService {
    list(query: OrganizacaoQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<PaginatedResponse<Organizacao>>(`${this.baseUrl}/administracao/organizacao/`, { params });
    }

    get(id: number) {
        return this.http.get<Organizacao>(`${this.baseUrl}/administracao/organizacao/${id}/`);
    }

    create(payload: OrganizacaoCreate) {
        return this.http.post<Organizacao>(`${this.baseUrl}/administracao/organizacao/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: OrganizacaoUpdate) {
        return this.http.patch<Organizacao>(`${this.baseUrl}/administracao/organizacao/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/administracao/organizacao/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }
}
