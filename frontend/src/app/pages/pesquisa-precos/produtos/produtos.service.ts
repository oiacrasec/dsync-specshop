import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { UiTableListResponse } from '@/app/shared/ui/table/table';
import { TrackedProduct, TrackedProductWrite } from '@/app/types/produto';

const PRODUCTS = 'products';

@Injectable({ providedIn: 'root' })
export class ProdutosService extends BaseCrudService {
    list(query: Record<string, unknown> = {}): Observable<UiTableListResponse<TrackedProduct>> {
        return this.listTable<TrackedProduct>(PRODUCTS, query);
    }

    get(publicId: string) {
        return this.http.get<TrackedProduct>(this.productUrl(publicId));
    }

    create(payload: TrackedProductWrite) {
        return this.http.post<TrackedProduct>(`${this.baseUrl}/${PRODUCTS}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(publicId: string, payload: TrackedProductWrite) {
        return this.http.patch<TrackedProduct>(this.productUrl(publicId), payload).pipe(tap(() => this.invalidateTableCache()));
    }

    // Arquivar é a exclusão lógica do backend: o produto sai da lista e o histórico continua.
    archive(publicId: string) {
        return this.http.delete<void>(this.productUrl(publicId)).pipe(tap(() => this.invalidateTableCache()));
    }

    private productUrl(publicId: string) {
        return `${this.baseUrl}/${PRODUCTS}/${encodeURIComponent(publicId)}/`;
    }
}
