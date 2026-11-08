import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { PriceSearch, PriceSearchItem, PriceSearchListRow, PriceSearchWrite } from '@/app/types/pesquisa';

const SEARCHES = 'searches';

@Injectable({ providedIn: 'root' })
export class ShoppingService extends BaseCrudService {
    private messageService = inject(MessageService);

    list(query: Record<string, unknown> = {}) {
        return this.listTable<PriceSearch>(SEARCHES, { ...query, ordering: query['ordering'] || '-created_at' }).pipe(
            map((page) => ({
                ...page,
                data: page.data.map(
                    (search): PriceSearchListRow => ({
                        ...search,
                        product_count: new Set(search.items.map((item) => item.product)).size,
                        seller_states_label: search.seller_states.length ? search.seller_states.join(', ') : 'Todas',
                        destination_zip: search.destination_zip.replace(/^(\d{5})(\d{3})$/, '$1-$2')
                    })
                ),
                columns: page.columns?.flatMap((column) => {
                    if (column.field === 'created_at') {
                        return [
                            { ...column, header: 'Data' },
                            { field: 'product_count', header: 'Produtos (quantidade)', type: 'number' as const },
                            { field: 'seller_states_label', header: 'UF do vendedor' }
                        ];
                    }

                    return [{ ...column, ...(column.field === 'destination_zip' ? { header: 'CEP de entrega', nullablePlaceholder: '—' } : {}) }];
                })
            })),
            catchError((error: unknown) => {
                this.messageService.add({ severity: 'error', summary: 'Falha ao carregar pesquisas', detail: problemMessage(error, 'Confira os filtros e tente novamente.') });

                return throwError(() => error);
            })
        );
    }

    create(payload: PriceSearchWrite) {
        return this.http.post<PriceSearch>(`${this.baseUrl}/${SEARCHES}/`, payload).pipe(tap(() => this.invalidateTableCache()));
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
