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
