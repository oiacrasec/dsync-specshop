import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { apiEndpoint } from '@/app/core/utils/api-url';
import { PermissionCatalogGroup } from '@/app/types/permission';

// Catálogo do registry (fixo por versão do backend): uma busca por sessão do app.
@Injectable({ providedIn: 'root' })
export class PermissionCatalogService {
    private http = inject(HttpClient);
    private baseUrl = inject(API_BASE_URL);
    private catalog$?: Observable<PermissionCatalogGroup[]>;

    load(): Observable<PermissionCatalogGroup[]> {
        this.catalog$ ??= this.http.get<PermissionCatalogGroup[]>(apiEndpoint(this.baseUrl, '/permissions/')).pipe(shareReplay({ bufferSize: 1, refCount: false }));

        return this.catalog$;
    }
}
