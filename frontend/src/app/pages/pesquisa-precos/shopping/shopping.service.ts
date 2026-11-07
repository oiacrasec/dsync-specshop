import { Injectable } from '@angular/core';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { PriceSearch, PriceSearchItem, PriceSearchWrite } from '@/app/types/pesquisa';

const SEARCHES = 'searches';

@Injectable({ providedIn: 'root' })
export class ShoppingService extends BaseCrudService {
    create(payload: PriceSearchWrite) {
        return this.http.post<PriceSearch>(`${this.baseUrl}/${SEARCHES}/`, payload);
    }

    get(publicId: string) {
        return this.http.get<PriceSearch>(this.searchUrl(publicId));
    }

    // Uma requisição por linha (ADR 2003 §4): a tela dispara até 3 ao mesmo tempo.
    run(searchId: string, itemId: string) {
        return this.http.post<PriceSearchItem>(`${this.searchUrl(searchId)}items/${encodeURIComponent(itemId)}/run/`, {});
    }

    retry(searchId: string, itemId: string) {
        return this.http.post<PriceSearchItem>(`${this.searchUrl(searchId)}items/${encodeURIComponent(itemId)}/retry/`, {});
    }

    private searchUrl(publicId: string) {
        return `${this.baseUrl}/${SEARCHES}/${encodeURIComponent(publicId)}/`;
    }
}
