import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';

import { UiAutocomplete, UiLookupOptionsProvider, UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiButton } from '@/app/shared/ui/button/button';
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
    imports: [CommonModule, FormsModule, UiButton, UiAutocomplete, InputTextModule, IconFieldModule, InputIconModule, SelectModule, InputNumberModule],
    templateUrl: './filter.html',
    styles: [
        `
            .ui-filter-advanced-panel {
                background: color-mix(in srgb, var(--p-button-secondary-background, #e5e7eb) 18%, white 82%);
            }

            :host-context(.app-dark) .ui-filter-advanced-panel {
                background: color-mix(in srgb, var(--p-button-secondary-background, #4b5563) 24%, black 76%);
            }
        `
    ]
})
export class UiFilter implements OnChanges, OnDestroy {
    private http = inject(HttpClient);

    @Input() filters: UiFilterField[] = [];
    @Output() filtersChange = new EventEmitter<Record<string, any>>();

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
        return this.filters.filter((filter) => filter.placement === 'general');
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

    get hasAnyFilters() {
        return this.hasGeneralFilters || this.hasAdvancedFilters;
    }

    get generalPlaceholder() {
        const names = this.generalFilters.map((item) => item.header);

        if (!names.length) {
            return 'Buscar';
        }

        return `Buscar por ${names.join(', ')}`;
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
        this.emitFilters();
    }

    private emitFilters() {
        const query: Record<string, any> = {};

        const normalizedTerm = this.generalTerm.trim();

        if (this.hasGeneralFilters && normalizedTerm) {
            query['search'] = normalizedTerm;
        }

        for (const filter of this.advancedFilters) {
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

            return this.http.get<OptionsResponse>(endpoint, { params }).pipe(map((page): UiLookupOptionsResponse => ({ data: page.data, totalRecords: page.total_records, first, rows, hasNext: page.has_next })));
        };

        this.relationProviders.set(cacheKey, provider);

        return provider;
    }

    private buildSchemaKey() {
        return JSON.stringify(
            this.filters.map((filter) => ({
                field: filter.field,
                type: filter.type,
                lookups: filter.lookups ?? [],
                choices: filter.choices ?? []
            }))
        );
    }
}
