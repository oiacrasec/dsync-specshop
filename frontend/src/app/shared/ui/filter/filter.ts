import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, LOCALE_ID, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { UiAutocomplete, UiLookupOptionsProvider, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiInputDate } from '@/app/shared/ui/input-date/input-date';
import { toLookupResponse } from '@/app/core/utils/table-schema';
import { OptionsResponse } from '@/app/types/options';

export interface UiFilterChoice {
    label: string;
    value: any;
}

export interface UiFilterField {
    field: string;
    header: string;
    type: 'text' | 'number' | 'boolean' | 'choice' | 'date' | 'relation';
    placement: 'general' | 'advanced';
    lookups?: string[];
    choices?: UiFilterChoice[];
    lookup?: {
        endpoint: string;
    };
}

@Component({
    selector: 'ui-filter',
    standalone: true,
    imports: [CommonModule, FormsModule, UiAutocomplete, UiInputDate, InputTextModule, SelectModule, InputNumberModule],
    templateUrl: './filter.html',
    styles: [
        `
            .ui-filter-box {
                border-width: 1px;
                border-style: solid;
                border-radius: 8px;
                overflow: hidden;
            }

            .ui-filter-bar {
                display: flex;
                align-items: center;
                gap: 4px;
                min-height: 44px;
                padding: 0 4px 0 12px;
            }

            .ui-filter-search {
                display: flex;
                flex: 1;
                align-items: center;
                gap: 8px;
                min-width: 0;
                cursor: text;
            }

            .ui-filter-search input {
                flex: 1;
                min-width: 0;
                height: 42px;
                border: 0;
                outline: 0;
                background: transparent;
                font: inherit;
                font-size: 14px;
            }

            .ui-filter-search input::placeholder {
                color: var(--p-inputtext-placeholder-color);
            }

            .ui-filter-box:focus-within {
                border-color: var(--p-primary-color);
            }

            .ui-filter-divider {
                width: 1px;
                height: 24px;
                flex-shrink: 0;
            }

            .ui-filter-inline-field {
                flex: 0 0 170px;
                min-width: 0;
                padding: 6px 0;
            }

            .ui-filter-action {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-height: 36px;
                padding: 0 12px;
                border: 0;
                border-radius: 6px;
                background: transparent;
                font-size: 14px;
                font-weight: 500;
                white-space: nowrap;
                cursor: pointer;
            }

            .ui-filter-action:hover {
                background: var(--p-surface-100);
            }

            .ui-filter-action:focus-visible {
                outline: 2px solid var(--p-primary-color);
                outline-offset: -2px;
            }

            .ui-filter-action-open,
            .ui-filter-action-open:hover {
                background: var(--p-primary-50);
                color: var(--p-primary-700);
            }

            .ui-filter-count {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 20px;
                height: 20px;
                padding: 0 6px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 600;
            }

            .ui-filter-fields {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                gap: 16px;
                padding: 16px 16px 20px;
                border-top-width: 1px;
                border-top-style: solid;
            }

            :host-context(.app-dark) .ui-filter-action:hover {
                background: var(--p-surface-800);
            }

            :host-context(.app-dark) .ui-filter-action-open,
            :host-context(.app-dark) .ui-filter-action-open:hover {
                background: color-mix(in srgb, var(--p-primary-color) 18%, transparent);
                color: var(--p-primary-200);
            }

            @media (max-width: 640px) {
                .ui-filter-bar {
                    flex-wrap: wrap;
                    padding: 4px 4px 4px 12px;
                }

                .ui-filter-search {
                    flex-basis: 100%;
                }

                .ui-filter-inline-field {
                    flex: 1 1 140px;
                }

                .ui-filter-bar > .ui-filter-divider:first-of-type {
                    display: none;
                }
            }
        `
    ]
})
export class UiFilter implements OnChanges, OnDestroy {
    private http = inject(HttpClient);
    readonly locale = inject(LOCALE_ID);

    @Input() filters: UiFilterField[] = [];
    @Output() filtersChange = new EventEmitter<Record<string, any>>();
    /** Mostra o "Limpar" mesmo sem filtro (ex.: tabela ordenada, que o Limpar também desfaz). */
    @Input() clearable = false;

    /** Emitido pelo botão "Limpar", antes do filtersChange vazio (a tabela também zera a ordenação). */
    @Output() cleared = new EventEmitter<void>();

    advancedOpen = false;
    generalTerm = '';
    advancedValues: Record<string, any> = {};

    private destroy$ = new Subject<void>();
    private generalSearch$ = new Subject<string>();
    private schemaKey = '';
    private relationProviders = new Map<string, UiLookupOptionsProvider>();

    readonly booleanOptions = [
        { label: 'Todos', value: null },
        { label: 'Sim', value: true },
        { label: 'Não', value: false }
    ];

    constructor() {
        this.generalSearch$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => this.emitFilters());
    }

    ngOnChanges(changes: SimpleChanges) {
        if (!changes['filters']) {
            return;
        }

        const nextSchemaKey = this.buildSchemaKey();

        if (changes['filters'].firstChange) {
            this.schemaKey = nextSchemaKey;

            return;
        }

        if (this.schemaKey !== nextSchemaKey) {
            this.schemaKey = nextSchemaKey;
            this.generalTerm = '';
            this.advancedValues = {};
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get generalFilters() {
        return this.filters.filter((filter) => filter.placement === 'general' && filter.type === 'text');
    }

    get inlineFilters() {
        return this.filters.filter((filter) => filter.placement === 'general' && filter.type === 'date');
    }

    get advancedFilters() {
        return this.filters.filter((filter) => filter.placement === 'advanced');
    }

    get hasGeneralFilters() {
        return this.generalFilters.length > 0;
    }

    get hasAdvancedFilters() {
        return this.advancedFilters.length > 0;
    }

    get hasActiveFilters() {
        return !!this.generalTerm.trim() || Object.values(this.advancedValues).some((value) => value !== undefined && value !== null && value !== '');
    }

    get activeAdvancedCount() {
        return this.advancedFilters.filter((filter) => {
            const value = this.advancedValues[filter.field];

            return value !== undefined && value !== null && value !== '';
        }).length;
    }

    get hasAnyFilters() {
        return this.hasGeneralFilters || this.hasAdvancedFilters || this.inlineFilters.length > 0;
    }

    get generalPlaceholder() {
        const names = this.generalFilters.map((item) => item.header);

        if (!names.length) {
            return 'Buscar';
        }

        return `Buscar por ${names.map(toSentenceCase).join(', ')}`;
    }

    onGeneralInput(value: string) {
        this.generalTerm = value;
        this.generalSearch$.next(value.trim());
    }

    onAdvancedChange() {
        this.emitFilters();
    }

    toggleAdvanced() {
        this.advancedOpen = !this.advancedOpen;
    }

    clear() {
        this.generalTerm = '';
        this.advancedValues = {};
        this.cleared.emit();
        this.emitFilters();
    }

    private emitFilters() {
        const query: Record<string, any> = {};

        const normalizedTerm = this.generalTerm.trim();

        if (this.hasGeneralFilters && normalizedTerm) {
            query['search'] = normalizedTerm;
        }

        for (const filter of [...this.inlineFilters, ...this.advancedFilters]) {
            const value = this.advancedValues[filter.field];

            if (value === undefined || value === null || value === '') {
                continue;
            }

            query[filter.field] = value;
        }

        this.filtersChange.emit(query);
    }

    getRelationOptionsProvider(filter: UiFilterField): UiLookupOptionsProvider | undefined {
        if (filter.type !== 'relation' || !filter.lookup?.endpoint) {
            return undefined;
        }

        const cacheKey = `${filter.field}|${filter.lookup.endpoint}`;
        const cachedProvider = this.relationProviders.get(cacheKey);

        if (cachedProvider) {
            return cachedProvider;
        }

        const endpoint = filter.lookup.endpoint;

        // Contrato de options do Core (ADR 0011): resolve por public_id e responde em snake_case.
        const provider: UiLookupOptionsProvider = (query: UiLookupQuery) => {
            const first = query.first ?? 0;
            const rows = query.rows ?? 20;
            let params = new HttpParams().set('first', String(first)).set('rows', String(rows));

            if (query.pk !== undefined && query.pk !== null && query.pk !== '') {
                params = params.set('public_id', String(query.pk));
            } else if (query.q !== undefined && query.q !== null && query.q !== '') {
                params = params.set('q', String(query.q));
            }

            return this.http.get<OptionsResponse>(endpoint, { params }).pipe(map((page) => toLookupResponse(page, first, rows)));
        };

        this.relationProviders.set(cacheKey, provider);

        return provider;
    }

    private buildSchemaKey() {
        return JSON.stringify(
            this.filters.map((filter) => ({
                field: filter.field,
                type: filter.type,
                placement: filter.placement,
                lookups: filter.lookups ?? [],
                choices: filter.choices ?? []
            }))
        );
    }
}

// "Nome" → "nome" no meio da frase; siglas (CNPJ, UF) ficam como estão.
function toSentenceCase(label: string) {
    return label.length > 1 && label[1] === label[1].toLowerCase() ? label[0].toLowerCase() + label.slice(1) : label;
}
