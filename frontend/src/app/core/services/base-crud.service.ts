import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';

import { TableQueryCacheService } from '@/app/core/services/table-query-cache.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';

export abstract class BaseCrudService {
    protected http = inject(HttpClient);
    protected baseUrl = inject(API_BASE_URL);

    private tableCache = inject(TableQueryCacheService);
    private readonly cachePrefix = `${this.constructor.name}|`;

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
