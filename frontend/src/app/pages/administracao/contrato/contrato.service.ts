import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { ContratoAdministradorResetSenhaResult, ContratoAdministradoresResponse, Contrato, ContratoCreate, ContratoProvisionamentoInicialCreate, ContratoProvisionamentoInicialResult, ContratoUpdate } from '@/app/types/contrato';
import { PaginatedResponse } from '@/app/types/pagination';
import { UiLookupQuery, UiLookupOptionsResponse } from '@/app/shared/ui/autocomplete/autocomplete';

export interface ContratoQuery {
    page?: number;
    rows?: number;
    first?: number;
    nome?: string;
    ativo?: boolean;
    ordering?: string;
    id?: number;
    id__in?: string;
}

@Injectable({ providedIn: 'root' })
export class ContratoService extends BaseCrudService {
    list(query: ContratoQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<PaginatedResponse<Contrato>>(`${this.baseUrl}/administracao/contrato/`, { params });
    }

    options(query: UiLookupQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<UiLookupOptionsResponse>(`${this.baseUrl}/administracao/contrato/options/`, { params });
    }

    get(id: number) {
        return this.http.get<Contrato>(`${this.baseUrl}/administracao/contrato/${id}/`);
    }

    create(payload: ContratoCreate) {
        return this.http.post<Contrato>(`${this.baseUrl}/administracao/contrato/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: ContratoUpdate) {
        return this.http.patch<Contrato>(`${this.baseUrl}/administracao/contrato/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/administracao/contrato/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }

    provisionarPrimeiroAcesso(id: number, payload: ContratoProvisionamentoInicialCreate) {
        return this.http.patch<ContratoProvisionamentoInicialResult>(`${this.baseUrl}/administracao/contrato/${id}/provisionar-primeiro-acesso/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    administradores(id: number) {
        return this.http.get<ContratoAdministradoresResponse>(`${this.baseUrl}/administracao/contrato/${id}/administradores/`);
    }

    resetarSenhaAdministrador(id: number, usuarioId: number) {
        return this.http.patch<ContratoAdministradorResetSenhaResult>(`${this.baseUrl}/administracao/contrato/${id}/administradores/${usuarioId}/resetar-senha/`, {});
    }
}
