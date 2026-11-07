import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Navigation, Router, convertToParamMap, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { authInterceptor } from '@/app/core/interceptors/auth.interceptor';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { CONTEXT_KEY, SESSION_KEY } from '@/app/core/utils/session-data';
import { PROJECT_MENU } from '@/app/project/project.menu';
import { LoginResponse } from '@/app/types/auth';
import { PriceSearch, PriceSearchItem } from '@/app/types/pesquisa';
import { ShoppingResultadoPage } from './resultado/resultado';
import { ShoppingPage } from './shopping';

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

    it('lista os produtos como nome · modelo e bloqueia mais de 10', () => {
        const controller = configure(['search:create']);
        const page = TestBed.createComponent(ShoppingPage).componentInstance;

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
        const page = TestBed.createComponent(ShoppingPage).componentInstance;

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
