import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UiFilter, UiFilterField } from './filter';

const FILTERS: UiFilterField[] = [
    { field: 'name', header: 'Nome', type: 'text', placement: 'general' },
    { field: 'is_active', header: 'Situação', type: 'boolean', placement: 'advanced' }
];

describe('UiFilter — barra única', () => {
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
