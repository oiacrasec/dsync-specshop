import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Navigation, Router, convertToParamMap, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { authInterceptor } from '@/app/core/interceptors/auth.interceptor';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { CONTEXT_KEY, SESSION_KEY } from '@/app/core/utils/session-data';
import { PROJECT_MENU } from '@/app/project/project.menu';
import { UiTable } from '@/app/shared/ui/table/table';
import { UiFilter } from '@/app/shared/ui/filter/filter';
import { UiInputDate } from '@/app/shared/ui/input-date/input-date';
import { UiButton } from '@/app/shared/ui/button/button';
import { LoginResponse } from '@/app/types/auth';
import { PriceSearch, PriceSearchItem } from '@/app/types/pesquisa';
import routes from '../pesquisa-precos.routes';
import { ShoppingResultadoPage } from './resultado/resultado';
import { NewSearchPage } from './new-search/new-search';
import { ShoppingPage } from './shopping';
import { ShoppingService } from './shopping.service';

registerLocaleData(localePt);

const SEARCH_SCHEMA = {
    columns: [
        { field: 'created_at', label: 'Criada em', type: 'datetime' },
        { field: 'destination_zip', label: 'CEP', type: 'text' }
    ],
    filters: [
        { field: 'date_from', label: 'De', type: 'date', placement: 'general' },
        { field: 'date_to', label: 'Até', type: 'date', placement: 'general' }
    ],
    general_search: { parameter: 'search', label: 'Busca geral', fields: [{ field: 'product', label: 'Produto', lookup: 'icontains' }] },
    ordering_fields: ['created_at']
};

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const ORG_ID = '019a0000-0000-7000-8000-000000000002';
const SEARCH_ID = '019a0000-0000-7000-8000-000000000010';

function itemId(index: number) {
    return `019a0000-0000-7000-8000-0000000001${String(index).padStart(2, '0')}`;
}

function item(index: number, overrides: Partial<PriceSearchItem> = {}): PriceSearchItem {
    return {
        public_id: itemId(index),
        product: `p${index}`,
        product_name: `Produto ${index}`,
        product_model: `M${index}`,
        source: 'mercado_livre',
        source_label: 'Mercado Livre',
        status: 'pending',
        detail: '',
        started_at: null,
        finished_at: null,
        offer_count: null,
        min_price: null,
        median_price: null,
        avg_price: null,
        max_price: null,
        ...overrides
    };
}

function search(items: PriceSearchItem[]): PriceSearch {
    return { public_id: SEARCH_ID, sources: ['mercado_livre'], seller_states: ['SC'], destination_zip: '88010000', items, created_at: '2026-11-07T14:37:00Z' };
}

function login(): LoginResponse {
    const token = `e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;

    return { access: token, refresh: token, user: { public_id: USER_ID, username: 'maria', name: 'Maria', is_superuser: false, must_change_password: false } };
}

function configure(codes: string[], routeId: string | null = null) {
    TestBed.configureTestingModule({
        providers: [
            provideZonelessChangeDetection(),
            provideRouter([]),
            provideHttpClient(withInterceptors([authInterceptor])),
            provideHttpClientTesting(),
            { provide: API_BASE_URL, useValue: '/api/v1' },
            { provide: LOCALE_ID, useValue: 'pt-BR' },
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } } },
            MessageService
        ]
    });
    TestBed.inject(AuthSessionService).setSession(login());
    const contexts = TestBed.inject(UserContextService);

    spyOn(contexts, 'reloadPage');
    contexts.setActiveContext({ organization_public_id: ORG_ID, organization_name: 'Centro' });
    const controller = TestBed.inject(HttpTestingController);
    const permissions = TestBed.inject(PermissionContextService);

    permissions.loadForCurrentContext().subscribe();
    controller.expectOne('/api/v1/me/permissions/').flush({ permissions: codes });

    return controller;
}

function openResult(autorun: boolean) {
    const router = TestBed.inject(Router);

    spyOn(router, 'currentNavigation').and.returnValue((autorun ? { extras: { state: { autorun: true } } } : null) as Navigation | null);
    const page = TestBed.createComponent(ShoppingResultadoPage).componentInstance;

    page.ngOnInit();

    return page;
}

function runRequests(controller: HttpTestingController): TestRequest[] {
    return controller.match((request) => request.url.endsWith('/run/'));
}

describe('Shopping', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
    });

    it('declara o item Shopping com a permissão de ver pesquisas', () => {
        const entry = PROJECT_MENU.flatMap((section) => section.items).find((menuItem) => menuItem.label === 'Shopping');

        expect(entry?.permission).toBe('search:view');
    });

    it('separa a lista e o formulário por permissão e declara nova antes de :id', () => {
        expect(routes.find((route) => route.path === 'shopping')?.data?.['requiredPermission']).toBe('search:view');
        expect(routes.find((route) => route.path === 'shopping/nova')?.data?.['requiredPermission']).toBe('search:create');
        expect(routes.findIndex((route) => route.path === 'shopping/nova')).toBeLessThan(routes.findIndex((route) => route.path === 'shopping/:id'));
    });

    it('renderiza ui-table, conta produtos distintos e abre o resultado sem coletar', async () => {
        const controller = configure(['search:view']);
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const fixture = TestBed.createComponent(ShoppingPage);

        fixture.detectChanges();
        const request = controller.expectOne((request) => request.url === '/api/v1/searches/');

        expect(request.request.params.get('rows')).toBe('10');
        expect(request.request.params.get('ordering')).toBe('-created_at');
        controller.expectOne('/api/v1/searches/schema/').flush(SEARCH_SCHEMA);
        request.flush({ data: [search([item(1), item(2), item(3, { product: 'p1', source: 'another_source' })])], total_records: 1 });
        await fixture.whenStable();
        fixture.detectChanges();
        const table = fixture.debugElement.query(By.directive(UiTable)).componentInstance as UiTable;
        const element = fixture.nativeElement as HTMLElement;
        const cells = Array.from(element.querySelectorAll('tbody tr:first-child td')).map((cell) => cell.textContent?.trim());

        expect(cells.slice(1, 4)).toEqual(['2', 'SC', '88010-000']);
        expect(table.tableColumns[0]).toEqual(jasmine.objectContaining({ field: 'created_at', header: 'Data', type: 'date', zoned: true, sortable: true }));
        expect(element.querySelector('.ui-table-count')?.textContent?.trim()).toBe('1 registro');
        expect(element.textContent).not.toContain('Nova pesquisa');
        const menuButton = element.querySelector('.ui-table-actions-col button[aria-label="Ações"]') as HTMLButtonElement;

        menuButton.click();
        fixture.detectChanges();
        expect(table.menuItems.map((entry) => entry.label)).toEqual(['Abrir']);
        table.menuItems[0].command?.({});
        expect(navigate).toHaveBeenCalledWith(['/pages/pesquisa-precos/shopping', SEARCH_ID]);
        fixture.componentInstance.open('../invalid');
        expect(navigate).toHaveBeenCalledTimes(1);
        controller.expectNone((request) => request.method === 'POST');
        controller.verify();
    });

    it('pagina e ordena no servidor sem repetir o schema ou carregar todas as pesquisas', async () => {
        const controller = configure(['search:view', 'search:create']);
        const fixture = TestBed.createComponent(ShoppingPage);

        fixture.detectChanges();
        controller.expectOne('/api/v1/searches/schema/').flush(SEARCH_SCHEMA);
        controller.expectOne((request) => request.url === '/api/v1/searches/').flush({ data: [{ ...search([item(1)]), seller_states: [], destination_zip: '' }], total_records: 25 });
        await fixture.whenStable();
        fixture.detectChanges();
        const table = fixture.debugElement.query(By.directive(UiTable)).componentInstance as UiTable;

        expect(fixture.nativeElement.querySelector('.p-paginator')).not.toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Nova pesquisa');
        expect(fixture.nativeElement.textContent).toContain('Todas');
        expect(fixture.nativeElement.textContent).toContain('—');
        table.handleLazyLoad({ first: 10, rows: 10, sortField: 'created_at', sortOrder: 1 });
        const next = controller.expectOne((request) => request.url === '/api/v1/searches/');

        expect(next.request.params.get('first')).toBe('10');
        expect(next.request.params.get('rows')).toBe('10');
        expect(next.request.params.get('ordering')).toBe('created_at');
        next.flush({ data: [], total_records: 25 });
        controller.expectNone('/api/v1/searches/schema/');
        controller.verify();
    });

    it('invalida a lista após criar e retorna do formulário para o Shopping', async () => {
        const controller = configure(['search:view', 'search:create']);
        const fixture = TestBed.createComponent(ShoppingPage);

        fixture.detectChanges();
        controller.expectOne('/api/v1/searches/schema/').flush(SEARCH_SCHEMA);
        controller.expectOne((request) => request.url === '/api/v1/searches/').flush({ data: [], total_records: 0 });
        await fixture.whenStable();
        fixture.destroy();
        TestBed.inject(ShoppingService)
            .create({ products: ['p1'], sources: ['mercado_livre'], seller_states: [], destination_zip: '' })
            .subscribe();
        controller.expectOne('/api/v1/searches/').flush(search([item(1)]), { status: 201, statusText: 'Created' });
        const reopened = TestBed.createComponent(ShoppingPage);

        reopened.detectChanges();
        controller.expectOne((request) => request.url === '/api/v1/searches/').flush({ data: [search([item(1)])], total_records: 1 });
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

        reopened.componentInstance.create();
        expect(navigate).toHaveBeenCalledWith('/pages/pesquisa-precos/shopping/nova');
        TestBed.createComponent(NewSearchPage).componentInstance.goBack();
        expect(navigate).toHaveBeenCalledWith('/pages/pesquisa-precos/shopping');
        controller.verify();
    });

    it('envia o produto e o período visível da barra ao servidor como datas sem hora', async () => {
        const controller = configure(['search:view']);
        const fixture = TestBed.createComponent(ShoppingPage);

        fixture.detectChanges();
        controller.expectOne('/api/v1/searches/schema/').flush(SEARCH_SCHEMA);
        controller.expectOne((request) => request.url === '/api/v1/searches/').flush({ data: [], total_records: 0 });
        await fixture.whenStable();
        fixture.detectChanges();
        const filter = fixture.debugElement.query(By.directive(UiFilter)).componentInstance as UiFilter;
        const dates = fixture.debugElement.queryAll(By.directive(UiInputDate));

        expect(fixture.nativeElement.querySelectorAll('.ui-filter-bar ui-input-date').length).toBe(2);
        expect(filter.generalPlaceholder).toBe('Buscar por produto');
        filter.generalTerm = 'Epson';
        dates[0].componentInstance.handleChange('07/11/2026');
        const start = controller.expectOne((request) => request.url === '/api/v1/searches/');

        expect(start.request.params.get('search')).toBe('Epson');
        expect(start.request.params.get('date_from')).toBe('2026-11-07');
        start.flush({ data: [], total_records: 0 });
        dates[1].componentInstance.handleChange('08/11/2026');
        const period = controller.expectOne((request) => request.url === '/api/v1/searches/');

        expect(period.request.params.get('date_from')).toBe('2026-11-07');
        expect(period.request.params.get('date_to')).toBe('2026-11-08');
        expect(period.request.params.get('first')).toBe('0');
        period.flush({ data: [], total_records: 0 });
        controller.expectNone('/api/v1/searches/schema/');
        controller.verify();
    });

    it('usa Nova pesquisa preenchido e menu compacto só nas linhas com nova tentativa', async () => {
        const controller = configure(['search:view', 'search:create', 'search:update'], SEARCH_ID);
        const fixture = TestBed.createComponent(ShoppingResultadoPage);

        fixture.detectChanges();
        controller.expectOne(`/api/v1/searches/${SEARCH_ID}/`).flush(search([item(1, { status: 'error' }), item(2, { status: 'done' })]));
        await fixture.whenStable();
        fixture.detectChanges();
        const table = fixture.debugElement.query(By.directive(UiTable)).componentInstance as UiTable;
        const buttons = fixture.debugElement.queryAll(By.directive(UiButton)).map((element) => element.componentInstance as UiButton);
        const create = buttons.find((button) => button.label === 'Nova pesquisa');

        expect(create?.severity).toBeUndefined();
        expect(create?.text).toBeFalse();
        expect(table.actionsTemplate).toBeUndefined();
        expect(fixture.nativeElement.querySelector('.ui-table-count')?.textContent.trim()).toBe('2 registros');
        const menuButtons = fixture.nativeElement.querySelectorAll('.ui-table-actions-col--compact button[aria-label="Ações"]') as NodeListOf<HTMLButtonElement>;

        expect(menuButtons.length).toBe(1);
        menuButtons[0].click();
        fixture.detectChanges();
        const retry = table.menuItems[0].command;

        expect(table.menuItems[0].label).toBe('Tentar de novo');
        retry?.({});
        controller.expectOne(`/api/v1/searches/${SEARCH_ID}/items/${itemId(1)}/retry/`).flush(item(1, { status: 'done' }));
        await fixture.whenStable();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.ui-table-actions-col--compact button[aria-label="Ações"]').length).toBe(0);
        retry?.({});
        controller.expectNone((request) => request.url.endsWith('/retry/'));
        controller.verify();
    });

    it('informa como corrigir o período inválido e encerra o carregamento da grid', async () => {
        const controller = configure(['search:view']);
        const add = spyOn(TestBed.inject(MessageService), 'add');
        const fixture = TestBed.createComponent(ShoppingPage);

        fixture.detectChanges();
        controller.expectOne('/api/v1/searches/schema/').flush(SEARCH_SCHEMA);
        controller.expectOne((request) => request.url === '/api/v1/searches/').flush({ data: [], total_records: 0 });
        await fixture.whenStable();
        fixture.detectChanges();
        const table = fixture.debugElement.query(By.directive(UiTable)).componentInstance as UiTable;

        table.handleFiltersChange({ date_from: '2026-11-08', date_to: '2026-11-07' });
        controller
            .expectOne((request) => request.url === '/api/v1/searches/')
            .flush({ type: 'urn:dsync:problem:validation-error', status: 422, errors: { date_to: ['A data final deve ser igual ou posterior à data inicial.'] } }, { status: 422, statusText: 'Unprocessable Entity' });
        expect(add).toHaveBeenCalledWith(jasmine.objectContaining({ detail: 'A data final deve ser igual ou posterior à data inicial.' }));
        expect(table.loading).toBeFalse();
        controller.verify();
    });

    it('lista os produtos como nome · modelo e bloqueia mais de 10', () => {
        const controller = configure(['search:create']);
        const page = TestBed.createComponent(NewSearchPage).componentInstance;

        page.ngOnInit();
        controller.expectOne((request) => request.url === '/api/v1/products/').flush({ data: [{ public_id: 'p1', name: 'Impressora', model: 'L3250' }], total_records: 1 });
        controller.expectOne('/api/v1/products/schema/').flush({ columns: [], filters: [], general_search: null, ordering_fields: [] });
        expect(page.productOptions()[0]?.label).toBe('Impressora · L3250');

        page.form.controls.products.setValue(Array.from({ length: 11 }, (_, index) => `p${index}`));
        page.search();
        expect(page.overLimit).toBeTrue();
        controller.expectNone('/api/v1/searches/');
    });

    it('cria a pesquisa e abre o resultado pedindo a execução', () => {
        const controller = configure(['search:create']);
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const page = TestBed.createComponent(NewSearchPage).componentInstance;

        page.form.setValue({ products: ['p1', 'p2'], sources: ['mercado_livre'], seller_states: ['SC'], destination_zip: '88010-000' });
        page.search();
        const request = controller.expectOne('/api/v1/searches/');

        expect(request.request.body).toEqual({ products: ['p1', 'p2'], sources: ['mercado_livre'], seller_states: ['SC'], destination_zip: '88010-000' });
        request.flush(search([item(1), item(2)]), { status: 201, statusText: 'Created' });
        expect(navigate).toHaveBeenCalledWith(['/pages/pesquisa-precos/shopping', SEARCH_ID], { state: { autorun: true } });
    });

    it('executa as linhas pendentes com no máximo 3 ao mesmo tempo e atualiza cada uma', () => {
        const controller = configure(['search:view', 'search:create'], SEARCH_ID);
        const page = openResult(true);

        controller.expectOne(`/api/v1/searches/${SEARCH_ID}/`).flush(search([1, 2, 3, 4].map((index) => item(index))));
        const firstWave = runRequests(controller);

        expect(firstWave.length).toBe(3);
        expect(page.rows().filter((row) => row.status === 'running').length).toBe(3);
        firstWave[0].flush(item(1, { status: 'done', min_price: '1095.79', offer_count: 240 }));
        const secondWave = runRequests(controller);

        expect(secondWave.length).toBe(1);
        expect(page.rows()[0].status).toBe('done');
        expect(page.rows()[0].min_price).toContain('1.095,79');
        firstWave[1].flush({ type: 'urn:dsync:problem:search-item-not-runnable', status: 409, title: 'x', detail: 'Pesquisa já executada.' }, { status: 409, statusText: 'Conflict' });
        expect(page.rows()[1].status).toBe('error');
        firstWave[2].flush(item(3, { status: 'unavailable', detail: 'O conector desta fonte ainda não está disponível.' }));
        secondWave[0].flush(item(4, { status: 'no_results' }));
        expect(page.running()).toBeFalse();
    });

    it('reabrir o resultado não coleta e oferece continuar só as pendentes', () => {
        const controller = configure(['search:view', 'search:create'], SEARCH_ID);
        const page = openResult(false);

        controller.expectOne(`/api/v1/searches/${SEARCH_ID}/`).flush(search([item(1, { status: 'done' }), item(2)]));
        expect(runRequests(controller).length).toBe(0);
        expect(page.hasPending).toBeTrue();

        page.continueSearch();
        const requests = runRequests(controller);

        expect(requests.map((request) => request.request.url)).toEqual([`/api/v1/searches/${SEARCH_ID}/items/${itemId(2)}/run/`]);
    });

    it('tentar de novo aparece só em linha com falha e com a permissão', () => {
        const controller = configure(['search:view', 'search:update'], SEARCH_ID);
        const page = openResult(false);

        controller.expectOne(`/api/v1/searches/${SEARCH_ID}/`).flush(search([item(1, { status: 'unavailable' }), item(2, { status: 'done' })]));
        expect(page.canRetryRow(page.rows()[0])).toBeTrue();
        expect(page.canRetryRow(page.rows()[1])).toBeFalse();

        page.retry(page.rows()[0]);
        controller.expectOne(`/api/v1/searches/${SEARCH_ID}/items/${itemId(1)}/retry/`).flush(item(1, { status: 'done' }));
        expect(page.rows()[0].status).toBe('done');
    });
});
