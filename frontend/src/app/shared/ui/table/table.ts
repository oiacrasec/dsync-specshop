import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ContentChild, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, TemplateRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Subject, takeUntil } from 'rxjs';

import { UiButton } from '@/app/shared/ui/button/button';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { UiFilter, UiFilterField } from '@/app/shared/ui/filter/filter';
import { TableQueryCacheService } from '@/app/core/services/table-query-cache.service';

type TagSeverity = 'secondary' | 'info' | 'success' | 'warn' | 'danger' | 'contrast' | null | undefined;

export interface UiTableColumn {
    field: string;
    header: string;
    sortable?: boolean;
    type?: 'text' | 'number' | 'date' | 'boolean-tag' | 'choice' | 'relation';
    format?: string;
    nullablePlaceholder?: string;
    booleanTag?: {
        trueLabel: string;
        trueSeverity: TagSeverity;
        falseLabel: string;
        falseSeverity: TagSeverity;
    };
    choices?: Array<{ label: string; value: any }>;
    displayField?: string;
    valueField?: string;
}

export interface UiTableAction<T = any> {
    id: string;
    label: string;
    icon?: string;
    severity?: TagSeverity;
    handler?: (row: T) => void;
}

export interface UiTableListResponse<T> {
    data: T[];
    totalRecords: number;
    columns?: UiTableColumn[];
    filters?: UiFilterField[];
}

export interface UiTableDataService<T> {
    list(query?: Record<string, any>): any;
}

@Component({
    selector: 'ui-table',
    standalone: true,
    imports: [CommonModule, TableModule, TagModule, UiButton, MenuModule, UiFilter],
    templateUrl: './table.html',
    styles: [
        `
        :host {
            display: block;
        }

        .ui-table-actions-wrapper {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            width: 100%;
        }

        .ui-table-actions-wrapper--compact {
            justify-content: center;
        }

        :host ::ng-deep th.ui-table-actions-col--compact,
        :host ::ng-deep td.ui-table-actions-col--compact {
            width: 50px;
            min-width: 50px;
            max-width: 50px;
            text-align: center;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }

        :host ::ng-deep .ui-table-paginator {
            justify-content: center;
            position: relative;
        }

        :host ::ng-deep .ui-table-paginator .p-paginator-current {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            margin: 0;
            text-align: right;
            white-space: nowrap;
        }

        @media (max-width: 768px) {
            :host ::ng-deep .ui-table-paginator {
                flex-wrap: wrap;
                row-gap: 0.5rem;
            }

            :host ::ng-deep .ui-table-paginator .p-paginator-current {
                position: static;
                transform: none;
                order: 99;
                flex: 0 0 100%;
                margin-top: 0.25rem;
                text-align: right;
            }
        }
        `
    ]
})
export class UiTable<T = any> implements OnInit, OnChanges, OnDestroy {
    private cdRef = inject(ChangeDetectorRef);
    private router = inject(Router);
    private tableQueryCache = inject(TableQueryCacheService);
    @Input() service?: UiTableDataService<T>;
    @Input() value: T[] = [];
    @Input() columns: UiTableColumn[] = [];
    @Input() totalRecords = 0;
    @Input() rows = 10;
    @Input() first = 0;
    @Input() rowsPerPageOptions: number[] = [10, 20, 50];
    @Input() loading = false;
    @Input() loadingIcon = 'pi pi-spin pi-spinner';
    @Input() dataKey = 'id';
    @Input() currentPageReportTemplate = 'Mostrando {first} a {last} de {totalRecords} registros';
    @Input() showCurrentPageReport = true;
    @Input() lazy = true;
    @Input() lazyLoadOnInit = false;
    @Input() paginator = true;
    @Input() emptyMessage = 'Nenhum registro encontrado.';
    @Input() actions: UiTableAction<T>[] = [];
    @Input() actionsMode: 'buttons' | 'menu' = 'menu';
    @Input() reloadKey = 0;
    @Input() cacheEnabled = true;
    @Input() cacheTtlMs = 30000;
    @Input() cacheNamespace?: string;

    @Output() lazyLoad = new EventEmitter<TableLazyLoadEvent>();

    @ContentChild('actions', { read: TemplateRef }) actionsTemplate?: TemplateRef<any>;

    private destroy$ = new Subject<void>();
    private internalValue: T[] = [];
    private internalColumns: UiTableColumn[] = [];
    private internalFilters: UiFilterField[] = [];
    private internalTotalRecords = 0;
    private sortField?: string;
    private sortOrder?: 1 | 0 | -1;
    private filtersQuery: Record<string, any> = {};
    private columnsSchemaKey = '';
    private filtersSchemaKey = '';
    menuItems: MenuItem[] = [];

    ngOnInit() {
        if (this.service) {
            this.fetch();
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (!this.service) {
            return;
        }
        if (changes['reloadKey'] && !changes['reloadKey'].firstChange) {
            this.fetch(true);
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get tableValue() {
        return this.service ? this.internalValue : this.value;
    }

    get tableColumns() {
        return this.service ? this.internalColumns : this.columns;
    }

    get tableTotalRecords() {
        return this.service ? this.internalTotalRecords : this.totalRecords;
    }

    get tableFilters() {
        return this.service ? this.internalFilters : [];
    }

    handleLazyLoad(event: TableLazyLoadEvent) {
        this.lazyLoad.emit(event);
        if (!this.service) {
            return;
        }
        this.first = event.first ?? 0;
        this.rows = event.rows ?? this.rows;
        if (typeof event.sortField === 'string') {
            this.sortField = event.sortField;
        }
        if (event.sortOrder === 1 || event.sortOrder === 0 || event.sortOrder === -1) {
            this.sortOrder = event.sortOrder;
        }
        this.fetch();
    }

    handleFiltersChange(query: Record<string, any>) {
        this.filtersQuery = query;
        this.first = 0;
        this.fetch();
    }

    private fetch(forceRefresh = false) {
        if (!this.service) {
            return;
        }
        const ordering = this.sortField ? (this.sortOrder === -1 ? `-${this.sortField}` : this.sortField) : undefined;
        const query = {
            first: this.first,
            rows: this.rows,
            ordering,
            ...this.filtersQuery
        };
        const cacheKey = this.buildCacheKey(query);
        if (this.cacheEnabled && !forceRefresh) {
            const cached = this.tableQueryCache.get<UiTableListResponse<T>>(cacheKey);
            if (cached) {
                this.internalValue = cached.data;
                this.internalTotalRecords = cached.totalRecords;
                this.updateColumnsSchema(cached.columns ?? []);
                this.updateFiltersSchema(cached.filters ?? []);
                this.loading = false;
                queueMicrotask(() => this.cdRef.detectChanges());
                return;
            }
        }

        this.loading = true;
        this.service
            .list(query)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: UiTableListResponse<T>) => {
                    this.internalValue = response.data;
                    this.internalTotalRecords = response.totalRecords;
                    this.updateColumnsSchema(response.columns ?? []);
                    this.updateFiltersSchema(response.filters ?? []);
                    if (this.cacheEnabled) {
                        this.tableQueryCache.set(cacheKey, response, this.cacheTtlMs);
                    }
                    this.loading = false;
                    queueMicrotask(() => this.cdRef.detectChanges());
                },
                error: () => {
                    this.loading = false;
                    queueMicrotask(() => this.cdRef.detectChanges());
                }
            });
    }

    private updateColumnsSchema(nextColumns: UiTableColumn[]) {
        const nextKey = JSON.stringify(
            nextColumns.map((column) => ({
                field: column.field,
                header: column.header,
                sortable: column.sortable ?? false,
                type: column.type ?? 'text',
                format: column.format ?? null,
                nullablePlaceholder: column.nullablePlaceholder ?? null,
                booleanTag: column.booleanTag ?? null,
                choices: column.choices ?? [],
                displayField: column.displayField ?? null,
                valueField: column.valueField ?? null
            }))
        );
        if (this.columnsSchemaKey === nextKey) {
            return;
        }
        this.columnsSchemaKey = nextKey;
        this.internalColumns = nextColumns;
    }

    private updateFiltersSchema(nextFilters: UiFilterField[]) {
        const nextKey = JSON.stringify(
            nextFilters.map((filter) => ({
                field: filter.field,
                type: filter.type,
                lookups: filter.lookups ?? [],
                choices: filter.choices ?? []
            }))
        );
        if (this.filtersSchemaKey === nextKey) {
            return;
        }
        this.filtersSchemaKey = nextKey;
        this.internalFilters = nextFilters;
    }


    getCellValue(row: Record<string, any>, column: UiTableColumn) {
        if (column.displayField) {
            return row[column.displayField];
        }
        return row[column.field];
    }

    resolveNullableValue(value: any, column: UiTableColumn) {
        if (value !== null && value !== undefined && value !== '') {
            return value;
        }

        if (column.nullablePlaceholder !== undefined && column.nullablePlaceholder !== null && column.nullablePlaceholder !== '') {
            return column.nullablePlaceholder;
        }

        return '';
    }

    resolveChoiceLabel(column: UiTableColumn, value: any) {
        if (!column.choices) {
            return value;
        }
        const match = column.choices.find((item) => item.value === value);
        return match ? match.label : value;
    }

    private buildMenuItems(row: T): MenuItem[] {
        return this.actions.map((action) => ({
            label: action.label,
            icon: action.icon,
            command: () => action.handler?.(row)
        }));
    }

    openMenu(event: Event, menu: any, row: T) {
        event.stopPropagation();
        event.preventDefault();
        this.menuItems = this.buildMenuItems(row);
        if (typeof menu.show === 'function') {
            menu.show(event);
            return;
        }
        menu.toggle(event);
    }

    private buildCacheKey(query: Record<string, any>) {
        const serviceName = this.service?.constructor?.name ?? 'UnknownService';
        const namespace = this.cacheNamespace?.trim() || this.router.url || 'unknown-route';
        return `${serviceName}|${namespace}|${JSON.stringify(query)}`;
    }
}
