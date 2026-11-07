import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Table } from 'primeng/table';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';

import { UiFilter } from '@/app/shared/ui/filter/filter';
import { UiTable, UiTableListResponse } from './table';

describe('UiTable — limpar filtros', () => {
    const response: UiTableListResponse<{ public_id: string; name: string }> = {
        data: [{ public_id: '1', name: 'Cliente' }],
        totalRecords: 1,
        columns: [{ field: 'name', header: 'Nome', sortable: true }],
        filters: [{ field: 'name', header: 'Nome', type: 'text', placement: 'general' }]
    };

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), { provide: API_BASE_URL, useValue: '/api/v1' }] });
    });

    afterEach(() => TestBed.resetTestingModule());

    it('ao limpar, zera também a ordenação e busca sem ordering', async () => {
        const service = { list: jasmine.createSpy('list').and.returnValue(of(response)) };
        const fixture = TestBed.createComponent(UiTable);
        const table = fixture.componentInstance;

        table.service = service;
        table.cacheEnabled = false;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        table.handleLazyLoad({ first: 0, rows: 10, sortField: 'name', sortOrder: -1 });
        expect(service.list.calls.mostRecent().args[0].ordering).toBe('-name');

        const primeTable = fixture.debugElement.query((element) => element.componentInstance instanceof Table).componentInstance as Table;

        primeTable.sortField = 'name';
        primeTable.sortOrder = -1;
        const calls = service.list.calls.count();
        const notified = spyOn(primeTable.tableService, 'onSort').and.callThrough();

        const filter = fixture.debugElement.query((element) => element.componentInstance instanceof UiFilter).componentInstance as UiFilter;

        filter.clear();

        expect(service.list.calls.count()).toBe(calls + 1);
        expect(service.list.calls.mostRecent().args[0].ordering).toBeUndefined();
        expect(service.list.calls.mostRecent().args[0].first).toBe(0);
        expect(primeTable.sortField).toBeUndefined();
        expect(primeTable.sortOrder).toBe(primeTable.defaultSortOrder);
        expect(notified).toHaveBeenCalledOnceWith(null);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('th[aria-sort="descending"], th[aria-sort="ascending"]')).toBeNull();
    });
});

describe('UiTable — paginação e Limpar', () => {
    const page = (totalRecords: number): UiTableListResponse<{ public_id: string; name: string }> => ({
        data: [{ public_id: '1', name: 'Cliente' }],
        totalRecords,
        columns: [{ field: 'name', header: 'Nome', sortable: true }],
        filters: [{ field: 'name', header: 'Nome', type: 'text', placement: 'general' }]
    });

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), { provide: API_BASE_URL, useValue: '/api/v1' }] });
    });

    afterEach(() => TestBed.resetTestingModule());

    async function render(totalRecords: number) {
        const fixture = TestBed.createComponent(UiTable);
        const table = fixture.componentInstance;

        table.service = { list: () => of(page(totalRecords)) };
        table.cacheEnabled = false;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        return { fixture, table, element: fixture.nativeElement as HTMLElement };
    }

    const clearButton = (element: HTMLElement) => Array.from(element.querySelectorAll('ui-filter button')).find((button) => button.textContent?.includes('Limpar'));

    it('com tudo numa página, troca a paginação pela contagem', async () => {
        const { element } = await render(2);

        expect(element.querySelector('.p-paginator')).toBeNull();
        expect(element.querySelector('.ui-table-count')?.textContent?.trim()).toBe('2 registros');
    });

    it('a contagem é global e fica no lugar do relatório da paginação', async () => {
        const { element } = await render(1);
        const count = element.querySelector('.ui-table-count') as HTMLElement;

        expect(count.textContent?.trim()).toBe('1 registro');
        expect(getComputedStyle(count).textAlign).toBe('right');
    });

    it('mostra 10 linhas por página por padrão', async () => {
        const { table, element } = await render(15);

        expect(table.rows).toBe(10);
        expect(element.querySelector('.p-paginator')).not.toBeNull();
    });

    it('com mais de uma página, mostra a paginação', async () => {
        const { table, element } = await render(45);

        expect(table.showPaginator).toBeTrue();
        expect(element.querySelector('.p-paginator')).not.toBeNull();
        expect(element.querySelector('.ui-table-count')).toBeNull();

        const report = getComputedStyle(element.querySelector('.p-paginator-current') as HTMLElement);

        expect(parseFloat(report.fontSize)).toBe(parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.875);
        expect(report.fontWeight).toBe('400');
    });

    it('mostra o Limpar só com busca ou ordenação ativa', async () => {
        const { fixture, table, element } = await render(2);

        expect(clearButton(element)).toBeUndefined();

        table.handleLazyLoad({ first: 0, rows: 20, sortField: 'name', sortOrder: 1 });
        fixture.detectChanges();

        expect(clearButton(element)).toBeDefined();
    });
});

describe('UiTable — coluna choice-tag', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), { provide: API_BASE_URL, useValue: '/api/v1' }] });
    });

    afterEach(() => TestBed.resetTestingModule());

    it('mostra a opção como tag com a severidade declarada', async () => {
        const fixture = TestBed.createComponent(UiTable);
        const table = fixture.componentInstance;

        table.value = [{ public_id: '1', status: 'done' }];
        table.columns = [
            {
                field: 'status',
                header: 'Situação',
                type: 'choice-tag',
                choices: [
                    { label: 'Concluída', value: 'done', severity: 'success' },
                    { label: 'Erro', value: 'error', severity: 'danger' }
                ]
            }
        ];
        table.lazy = false;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const tag: HTMLElement = fixture.nativeElement.querySelector('td p-tag, td .p-tag');

        expect(tag.textContent?.trim()).toBe('Concluída');
        expect(table.resolveChoiceSeverity(table.columns[0], 'error')).toBe('danger');
        expect(table.resolveChoiceSeverity(table.columns[0], 'outro')).toBe('secondary');
    });
});
