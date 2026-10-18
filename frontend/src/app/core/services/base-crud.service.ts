import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { TableQueryCacheService } from '@/app/core/services/table-query-cache.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { toLookupResponse, toTableResponse } from '@/app/core/utils/table-schema';
import { UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiTableListResponse } from '@/app/shared/ui/table/table';
import { OptionsResponse } from '@/app/types/options';
import { PageResponse, TableSchema } from '@/app/types/table-schema';

export abstract class BaseCrudService {
    protected http = inject(HttpClient);
    protected baseUrl = inject(API_BASE_URL);

    private tableCache = inject(TableQueryCacheService);
    private readonly cachePrefix = `${this.constructor.name}|`;
    private schemas = new Map<string, Observable<TableSchema>>();

    /** Listagem do Core (`resource` sem barras, ex.: 'admin/contracts'): schema buscado uma vez por recurso. */
    protected listTable<T>(resource: string, query: Record<string, unknown> = {}): Observable<UiTableListResponse<T>> {
        const page$ = this.http.get<PageResponse<T>>(`${this.baseUrl}/${resource}/`, { params: this.buildParams(query) });

        return forkJoin([this.tableSchema(resource), page$]).pipe(map(([schema, page]) => toTableResponse(schema, page, this.baseUrl)));
    }

    /** Opções do Core (ADR 0011): busca por `q` ou resolve rótulos por `public_id`. */
    protected lookupOptions(resource: string, query: UiLookupQuery): Observable<UiLookupOptionsResponse> {
        const first = query.first ?? 0;
        const rows = query.rows ?? 20;
        const params = this.buildParams(query.pk ? { public_id: query.pk, first, rows } : { q: query.q, first, rows });

        return this.http.get<OptionsResponse>(`${this.baseUrl}/${resource}/options/`, { params }).pipe(map((page) => toLookupResponse(page, first, rows)));
    }

    private tableSchema(resource: string) {
        let schema$ = this.schemas.get(resource);

        if (!schema$) {
            schema$ = this.http.get<TableSchema>(`${this.baseUrl}/${resource}/schema/`).pipe(shareReplay({ bufferSize: 1, refCount: false }));
            this.schemas.set(resource, schema$);
        }

        return schema$;
    }

    protected buildParams(query: Record<string, any>) {
        let params = new HttpParams();

        Object.entries(query).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                return;
            }

            params = params.set(key, String(value));
        });

        return params;
    }

    protected invalidateTableCache() {
        this.tableCache.clearPrefix(this.cachePrefix);
    }
}
