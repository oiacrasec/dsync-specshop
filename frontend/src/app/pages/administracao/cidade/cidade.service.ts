import { Injectable } from '@angular/core';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';

@Injectable({ providedIn: 'root' })
export class CidadeService extends BaseCrudService {
    options(query: UiLookupQuery = {}) {
        const params = this.buildParams(query);
        return this.http.get<UiLookupOptionsResponse>(`${this.baseUrl}/administracao/cidade/options/`, { params });
    }
}
