import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { UiInputDate } from '@/app/shared/ui/input-date/input-date';

import { UiFilter, UiFilterField } from './filter';

const FILTERS: UiFilterField[] = [
    { field: 'name', header: 'Nome', type: 'text', placement: 'general' },
    { field: 'is_active', header: 'Situação', type: 'boolean', placement: 'advanced' }
];

describe('UiFilter — barra única', () => {
    it('mantém datas na barra geral e emite ISO sem hora junto com a busca', async () => {
        TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }] });
        const { fixture, filter, element } = render();

        fixture.componentRef.setInput('filters', [
            { field: 'product', header: 'Produto', type: 'text', placement: 'general' },
            { field: 'date_from', header: 'De', type: 'date', placement: 'general' },
            { field: 'date_to', header: 'Até', type: 'date', placement: 'general' }
        ]);
        fixture.detectChanges();
        await fixture.whenStable();
        const dates = fixture.debugElement.queryAll(By.directive(UiInputDate));
        const emitted: Record<string, any>[] = [];

        filter.filtersChange.subscribe((query) => emitted.push(query));
        filter.generalTerm = 'L3250';
        dates[0].componentInstance.handleChange('07/11/2026');
        dates[1].componentInstance.handleChange('08/11/2026');
        expect(dates.length).toBe(2);
        expect(element.querySelectorAll('.ui-filter-bar ui-input-date').length).toBe(2);
        expect(filter.generalPlaceholder).toBe('Buscar por produto');
        expect(filter.hasAdvancedFilters).toBeFalse();
        expect(emitted.at(-1)).toEqual({ search: 'L3250', date_from: '2026-11-07', date_to: '2026-11-08' });
        filter.clear();
        expect(emitted.at(-1)).toEqual({});
    });

    function render() {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()] });
        const fixture = TestBed.createComponent(UiFilter);

        fixture.componentRef.setInput('filters', FILTERS);
        fixture.detectChanges();

        return { fixture, filter: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
    }

    const button = (element: HTMLElement, text: string) => Array.from(element.querySelectorAll('button')).find((item) => item.textContent?.includes(text));

    it('abre os campos dentro da mesma caixa e indica o estado', () => {
        const { fixture, element } = render();
        const toggle = button(element, 'Filtros avançados')!;

        expect(element.querySelector('.ui-filter-box input')).not.toBeNull();
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(element.querySelector('#ui-filter-advanced')).toBeNull();

        toggle.click();
        fixture.detectChanges();

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(element.querySelector('.ui-filter-box #ui-filter-advanced label')?.textContent?.trim()).toBe('Situação');
    });

    it('mostra a quantidade e o Limpar só com filtro aplicado', () => {
        const { fixture, filter, element } = render();
        const emitted: Record<string, unknown>[] = [];

        filter.filtersChange.subscribe((query) => emitted.push(query));
        expect(button(element, 'Limpar')).toBeUndefined();
        expect(element.querySelector('.ui-filter-count')).toBeNull();

        filter.advancedValues['is_active'] = false;
        filter.onAdvancedChange();
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();

        expect(element.querySelector('.ui-filter-count')?.textContent?.trim()).toBe('1');
        button(element, 'Limpar')!.click();
        fixture.detectChanges();

        expect(emitted).toEqual([{ is_active: false }, {}]);
        expect(element.querySelector('.ui-filter-count')).toBeNull();
        expect(button(element, 'Limpar')).toBeUndefined();
    });
});
