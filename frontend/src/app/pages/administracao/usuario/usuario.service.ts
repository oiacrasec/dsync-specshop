import { Injectable } from '@angular/core';
import { map, tap } from 'rxjs/operators';

import { Usuario, UsuarioConfiguracao, UsuarioConfiguracaoUpdate, UsuarioCreate, UsuarioUpdate } from '@/app/types/usuario';
import { PaginatedResponse } from '@/app/types/pagination';
import { BaseCrudService } from '@/app/core/services/base-crud.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService extends BaseCrudService {
    list(query: UsuarioQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<PaginatedResponse<Usuario>>(`${this.baseUrl}/autorizacao/usuarios/`, { params }).pipe(
            map((response) => ({
                ...response,
                data: response.data,
                columns: [
                    { field: 'nome_completo', header: 'Nome', sortable: false, type: 'text' },
                    { field: 'username', header: 'Usuário', sortable: false, type: 'text' },
                    { field: 'email', header: 'Email', sortable: false, type: 'text' },
                    {
                        field: 'status_acesso',
                        header: 'Status de acesso',
                        sortable: false,
                        type: 'choice',
                        choices: [
                            { label: 'Ativo', value: 'ATIVO' },
                            { label: 'Bloqueado', value: 'BLOQUEADO' },
                            { label: 'Inativo', value: 'INATIVO' }
                        ]
                    },
                    {
                        field: 'must_change_password',
                        header: 'Troca de senha',
                        sortable: false,
                        type: 'boolean-tag',
                        booleanTag: {
                            trueLabel: 'Pendente',
                            trueSeverity: 'warn',
                            falseLabel: 'OK',
                            falseSeverity: 'success'
                        }
                    },
                    {
                        field: 'last_access_at',
                        header: 'Último acesso',
                        sortable: false,
                        type: 'date',
                        format: 'dd/MM/yyyy HH:mm',
                        nullablePlaceholder: '-'
                    }
                ],
                filters: [
                    {
                        field: 'nome_completo',
                        header: 'Nome completo',
                        type: 'text',
                        placement: 'general',
                        lookups: ['icontains']
                    }
                ]
            }))
        );
    }

    get(id: number) {
        return this.http.get<Usuario>(`${this.baseUrl}/autorizacao/usuarios/${id}/`);
    }

    getConfiguracao(id: number) {
        return this.http.get<UsuarioConfiguracao>(`${this.baseUrl}/autorizacao/usuarios/${id}/configuracao/`);
    }

    create(payload: UsuarioCreate) {
        return this.http.post<Usuario>(`${this.baseUrl}/autorizacao/usuarios/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: UsuarioUpdate) {
        return this.http.patch<Usuario>(`${this.baseUrl}/autorizacao/usuarios/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    updateConfiguracao(id: number, payload: UsuarioConfiguracaoUpdate) {
        return this.http.put<UsuarioConfiguracao>(`${this.baseUrl}/autorizacao/usuarios/${id}/configuracao/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/autorizacao/usuarios/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }
}

export interface UsuarioQuery {
    page?: number;
    rows?: number;
    first?: number;
    ordering?: string;
    search?: string;
}
