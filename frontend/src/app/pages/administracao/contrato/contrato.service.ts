import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiLookupOptionsProvider, UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiFilterField } from '@/app/shared/ui/filter/filter';
import { UiTableColumn, UiTableListResponse } from '@/app/shared/ui/table/table';
import { Contract, ContractAdminPasswordReset, ContractAdminsResponse, ContractListResponse, ContractProvision, ContractProvisionResult, ContractWrite, SchemaFilter, TableSchema } from '@/app/types/contrato';
import { OptionsResponse } from '@/app/types/options';

const CONTRACTS = 'admin/contracts';
const PLANS = 'admin/plans';

// Tabela do Core (ADR 0004/0026): listagem leve + schema buscado uma vez; o serviço adapta ao ui-table.
@Injectable({ providedIn: 'root' })
export class ContratoService extends BaseCrudService {
    private schema$?: Observable<TableSchema>;

    readonly planOptions: UiLookupOptionsProvider = (query) => this.options(PLANS, query);

    list(query: Record<string, unknown> = {}): Observable<UiTableListResponse<Contract>> {
        const params = this.buildParams(query);

        return forkJoin([this.schema(), this.http.get<ContractListResponse>(`${this.baseUrl}/${CONTRACTS}/`, { params })]).pipe(
            map(([schema, page]) => ({
                data: page.data,
                totalRecords: page.total_records,
                columns: toColumns(schema),
                filters: toFilters(schema, this.baseUrl)
            }))
        );
    }

    get(publicId: string) {
        return this.http.get<Contract>(`${this.baseUrl}/${CONTRACTS}/${publicId}/`);
    }

    create(payload: ContractWrite) {
        return this.http.post<Contract>(`${this.baseUrl}/${CONTRACTS}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(publicId: string, payload: ContractWrite) {
        return this.http.patch<Contract>(`${this.baseUrl}/${CONTRACTS}/${publicId}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(publicId: string) {
        return this.http.delete<void>(`${this.baseUrl}/${CONTRACTS}/${publicId}/`).pipe(tap(() => this.invalidateTableCache()));
    }

    provision(publicId: string, payload: ContractProvision) {
        return this.http.post<ContractProvisionResult>(`${this.baseUrl}/${CONTRACTS}/${publicId}/provision/`, payload);
    }

    admins(publicId: string) {
        // Um contrato tem poucos admins: uma página com o máximo da API (100).
        const params = this.buildParams({ first: 0, rows: 100 });

        return this.http.get<ContractAdminsResponse>(`${this.baseUrl}/${CONTRACTS}/${publicId}/admins/`, { params });
    }

    resetAdminPassword(publicId: string, userPublicId: string) {
        return this.http.post<ContractAdminPasswordReset>(`${this.baseUrl}/${CONTRACTS}/${publicId}/admins/${userPublicId}/reset-password/`, {});
    }

    private schema() {
        this.schema$ ??= this.http.get<TableSchema>(`${this.baseUrl}/${CONTRACTS}/schema/`).pipe(shareReplay({ bufferSize: 1, refCount: false }));

        return this.schema$;
    }

    private options(resource: string, query: UiLookupQuery): Observable<UiLookupOptionsResponse> {
        const first = query.first ?? 0;
        const rows = query.rows ?? 20;
        const params = this.buildParams(query.pk ? { public_id: query.pk, first, rows } : { q: query.q, first, rows });

        return this.http.get<OptionsResponse>(`${this.baseUrl}/${resource}/options/`, { params }).pipe(map((page) => toLookupResponse(page, first, rows)));
    }
}

function toLookupResponse(page: OptionsResponse, first: number, rows: number): UiLookupOptionsResponse {
    return { data: page.data, totalRecords: page.total_records, first, rows, hasNext: page.has_next };
}

function toColumns(schema: TableSchema): UiTableColumn[] {
    return schema.columns.map((column) => ({
        field: column.field,
        header: column.label,
        sortable: schema.ordering_fields.includes(column.field)
    }));
}

function toFilters(schema: TableSchema, baseUrl: string): UiFilterField[] {
    // ui-filter envia a busca geral como `search`, o parâmetro do Core.
    const general: UiFilterField[] = (schema.general_search?.fields ?? []).map((field) => ({
        field: field.field,
        header: field.label,
        type: 'text',
        placement: 'general'
    }));
    const advanced = schema.filters.map((filter) => toFilter(filter, baseUrl));

    return [...general, ...advanced];
}

function toFilter(filter: SchemaFilter, baseUrl: string): UiFilterField {
    const field: UiFilterField = {
        field: filter.field,
        header: filter.label,
        type: filter.type === 'datetime' ? 'date' : filter.type,
        placement: 'advanced'
    };

    if (filter.type === 'choice') {
        field.choices = filter.choices?.map((choice) => ({ label: choice.label, value: choice.value })) ?? [];
    }

    if (filter.type === 'relation' && filter.options_url) {
        // options_url vem do reverse do backend (ex.: /api/v1/admin/plans/options/); a base configurada já inclui /api/v1.
        field.lookup = { endpoint: resolveOptionsUrl(filter.options_url, baseUrl) };
    }

    return field;
}

function resolveOptionsUrl(optionsUrl: string, baseUrl: string) {
    const apiPrefix = '/api/v1/';

    return optionsUrl.startsWith(apiPrefix) ? `${baseUrl}/${optionsUrl.slice(apiPrefix.length)}` : optionsUrl;
}
