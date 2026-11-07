import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { EMPTY, from } from 'rxjs';
import { catchError, finalize, mergeMap } from 'rxjs/operators';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UUID_PATTERN } from '@/app/core/utils/session-data';
import { SPECSHOP_PERMISSION_KEYS } from '@/app/project/permission.keys';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiTable, UiTableColumn } from '@/app/shared/ui/table/table';
import { PriceSearch, PriceSearchItem } from '@/app/types/pesquisa';
import { ShoppingService } from '../shopping.service';

// Linhas executadas ao mesmo tempo pela tela (ADR 2003 §4).
const PARALLEL_RUNS = 3;
const RETRYABLE = new Set(['unavailable', 'error']);

interface ResultRow {
    public_id: string;
    label: string;
    min_price: string;
    offer_count: number | null;
    status: string;
    detail: string;
}

@Component({
    selector: 'app-shopping-resultado',
    standalone: true,
    imports: [CommonModule, UiTable, UiButton],
    templateUrl: './resultado.html'
})
export class ShoppingResultadoPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private shoppingService = inject(ShoppingService);
    private messageService = inject(MessageService);
    private permissionContext = inject(PermissionContextService);
    private currency = new Intl.NumberFormat(inject(LOCALE_ID), { style: 'currency', currency: 'BRL' });
    // Execução automática só logo após o clique em Pesquisar (D-16); reabrir a tela não coleta.
    private autorun = !!this.router.currentNavigation()?.extras.state?.['autorun'];

    // Zoneless: o estado que muda após respostas HTTP fica em signals para a tela redesenhar.
    readonly search = signal<PriceSearch | undefined>(undefined);
    readonly rows = signal<ResultRow[]>([]);
    readonly running = signal(false);
    canRun = false;
    canRetry = false;

    readonly columns: UiTableColumn[] = [
        { field: 'label', header: 'Produto e fonte' },
        { field: 'min_price', header: 'Menor preço', nullablePlaceholder: '—' },
        { field: 'offer_count', header: 'Ofertas', nullablePlaceholder: '—' },
        {
            field: 'status',
            header: 'Situação',
            type: 'choice-tag',
            choices: [
                { label: 'Pendente', value: 'pending', severity: 'secondary' },
                { label: 'Pesquisando…', value: 'running', severity: 'info' },
                { label: 'Concluída', value: 'done', severity: 'success' },
                { label: 'Sem resultado', value: 'no_results', severity: 'warn' },
                { label: 'Indisponível', value: 'unavailable', severity: 'danger' },
                { label: 'Erro', value: 'error', severity: 'danger' }
            ]
        },
        { field: 'detail', header: 'Detalhe', nullablePlaceholder: '' }
    ];

    ngOnInit() {
        this.canRun = this.permissionContext.hasPermission(SPECSHOP_PERMISSION_KEYS.SEARCH_CREATE);
        this.canRetry = this.permissionContext.hasPermission(SPECSHOP_PERMISSION_KEYS.SEARCH_UPDATE);
        const id = this.route.snapshot.paramMap.get('id');

        if (!id || !UUID_PATTERN.test(id)) {
            this.goBack();

            return;
        }

        this.load(id, this.autorun);
    }

    get hasPending() {
        return this.rows().some((row) => row.status === 'pending');
    }

    get summary() {
        const search = this.search();

        if (!search) {
            return '';
        }

        const states = search.seller_states.length ? search.seller_states.join(', ') : 'todas as UFs';
        const zip = search.destination_zip ? ` · entrega para ${search.destination_zip.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : '';

        return `Vendedor em ${states}${zip}`;
    }

    canRetryRow(row: ResultRow) {
        return this.canRetry && !this.running() && RETRYABLE.has(row.status);
    }

    goBack() {
        this.router.navigateByUrl('/pages/pesquisa-precos/shopping');
    }

    continueSearch() {
        this.runPending();
    }

    retry(row: ResultRow) {
        const search = this.search();

        if (!search) {
            return;
        }

        this.setStatus(row.public_id, 'running');
        this.shoppingService.retry(search.public_id, row.public_id).subscribe({
            next: (item) => this.applyItem(item),
            error: (error: unknown) => this.failRow(row.public_id, error)
        });
    }

    private load(id: string, runAfterLoad: boolean) {
        this.shoppingService.get(id).subscribe({
            next: (search) => {
                this.search.set(search);
                this.rows.set(search.items.map((item) => this.toRow(item)));

                if (runAfterLoad && this.canRun) {
                    this.runPending();
                }
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Pesquisa não encontrada', detail: 'Retornando para o Shopping.' });
                this.goBack();
            }
        });
    }

    private runPending() {
        const search = this.search();
        const pending = this.rows().filter((row) => row.status === 'pending');

        if (!search || !pending.length || this.running()) {
            return;
        }

        this.running.set(true);
        from(pending)
            .pipe(
                mergeMap((row) => {
                    this.setStatus(row.public_id, 'running');

                    return this.shoppingService.run(search.public_id, row.public_id).pipe(
                        catchError((error: unknown) => {
                            this.failRow(row.public_id, error);

                            return EMPTY;
                        })
                    );
                }, PARALLEL_RUNS),
                finalize(() => this.running.set(false))
            )
            .subscribe((item) => this.applyItem(item));
    }

    private applyItem(item: PriceSearchItem) {
        this.rows.update((rows) => rows.map((row) => (row.public_id === item.public_id ? this.toRow(item) : row)));
    }

    private failRow(publicId: string, error: unknown) {
        this.setStatus(publicId, 'error', problemMessage(error, 'Não foi possível pesquisar este produto.'));
    }

    private setStatus(publicId: string, status: string, detail = '') {
        this.rows.update((rows) => rows.map((row) => (row.public_id === publicId ? { ...row, status, detail } : row)));
    }

    private toRow(item: PriceSearchItem): ResultRow {
        return {
            public_id: item.public_id,
            label: `${item.product_name} · ${item.product_model} · ${item.source_label}`,
            min_price: item.min_price === null ? '' : this.currency.format(Number(item.min_price)),
            offer_count: item.offer_count,
            status: item.status,
            detail: item.detail
        };
    }
}
