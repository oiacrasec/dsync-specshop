import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { authInterceptor } from '@/app/core/interceptors/auth.interceptor';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { CONTEXT_KEY, SESSION_KEY } from '@/app/core/utils/session-data';
import { PROJECT_MENU } from '@/app/project/project.menu';
import { LoginResponse } from '@/app/types/auth';
import { TrackedProduct } from '@/app/types/produto';
import { UiTable } from '@/app/shared/ui/table/table';
import { UiFilter } from '@/app/shared/ui/filter/filter';
import { ProdutoFormPage } from './formulario/formulario';
import { ProdutosPage } from './produtos';
import { ProdutosService } from './produtos.service';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const ORG_ID = '019a0000-0000-7000-8000-000000000002';
const PRODUCT_ID = '019a0000-0000-7000-8000-000000000003';
const PRODUCT: TrackedProduct = { public_id: PRODUCT_ID, name: 'Impressora EcoTank', model: 'L3250', brand: 'Epson', ean: '', is_archived: false, created_at: '', updated_at: '' };

function login(): LoginResponse {
    const token = `e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;

    return { access: token, refresh: token, user: { public_id: USER_ID, username: 'maria', name: 'Maria', is_superuser: false, must_change_password: false } };
}

function configure(routeId: string | null = null) {
    TestBed.configureTestingModule({
        providers: [
            provideZonelessChangeDetection(),
            provideRouter([]),
            provideHttpClient(withInterceptors([authInterceptor])),
            provideHttpClientTesting(),
            { provide: API_BASE_URL, useValue: '/api/v1' },
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } } },
            MessageService
        ]
    });
    TestBed.inject(AuthSessionService).setSession(login());
    const contexts = TestBed.inject(UserContextService);

    spyOn(contexts, 'reloadPage');
    contexts.setActiveContext({ organization_public_id: ORG_ID, organization_name: 'Centro' });

    return { controller: TestBed.inject(HttpTestingController), permissions: TestBed.inject(PermissionContextService) };
}

function grant(controller: HttpTestingController, permissions: PermissionContextService, codes: string[]) {
    permissions.loadForCurrentContext().subscribe();
    controller.expectOne('/api/v1/me/permissions/').flush({ permissions: codes });
}

function problem422(errors: Record<string, string[]>) {
    return { type: 'urn:dsync:problem:validation-error', status: 422, title: 'Dados inválidos', detail: 'Corrija os campos.', instance: '/x', request_id: 'r', errors };
}

describe('Meus produtos', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
    });

    it('declara o item de menu com a permissão de ver produtos', () => {
        const item = PROJECT_MENU.flatMap((section) => section.items).find((entry) => entry.label === 'Meus produtos');

        expect(item?.permission).toBe('product:view');
        expect(item?.routerLink).toEqual(['/pages/pesquisa-precos/produtos']);
    });

    it('mostra novo, editar e arquivar conforme as permissões', () => {
        const { controller, permissions } = configure();

        grant(controller, permissions, ['product:view', 'product:delete']);
        const page = TestBed.createComponent(ProdutosPage).componentInstance;

        page.ngOnInit();
        expect(page.canCreate).toBeFalse();
        expect(page.tableActions.map((action) => [action.id, action.label])).toEqual([['delete', 'Arquivar']]);
    });

    it('arquiva só depois da confirmação e recarrega a lista', () => {
        const { controller } = configure();
        const fixture = TestBed.createComponent(ProdutosPage);
        const page = fixture.componentInstance;
        const confirm = spyOn(fixture.debugElement.injector.get(ConfirmationService), 'confirm');

        page.archive(PRODUCT);
        controller.expectNone(`/api/v1/products/${PRODUCT_ID}/`);
        const options = confirm.calls.mostRecent().args[0];

        expect(options.message).toContain('Impressora EcoTank · L3250');
        options.accept?.();
        const request = controller.expectOne(`/api/v1/products/${PRODUCT_ID}/`);

        expect(request.request.method).toBe('DELETE');
        request.flush(null, { status: 204, statusText: 'No Content' });
        expect(page.reloadKey).toBe(1);
    });

    it('filtra arquivados no servidor e omite ações de escrita nessas linhas', async () => {
        const { controller, permissions } = configure();

        grant(controller, permissions, ['product:view', 'product:update', 'product:delete']);
        const fixture = TestBed.createComponent(ProdutosPage);

        fixture.detectChanges();
        controller.expectOne('/api/v1/products/schema/').flush({
            columns: [
                { field: 'name', label: 'Nome', type: 'text' },
                { field: 'model', label: 'Modelo', type: 'text' },
                { field: 'brand', label: 'Marca', type: 'text' },
                { field: 'ean', label: 'EAN', type: 'text' },
                { field: 'is_archived', label: 'Arquivado', type: 'boolean' }
            ],
            filters: [
                {
                    field: 'archived',
                    label: 'Arquivado',
                    type: 'choice',
                    choices: [
                        { value: 'false', label: 'Não' },
                        { value: 'true', label: 'Sim' },
                        { value: 'all', label: 'Todos' }
                    ]
                }
            ],
            general_search: null,
            ordering_fields: ['name']
        });
        controller.expectOne((request) => request.url === '/api/v1/products/').flush({ data: [PRODUCT], total_records: 1 });
        await fixture.whenStable();
        fixture.detectChanges();
        const table = fixture.debugElement.query(By.directive(UiTable)).componentInstance as UiTable<TrackedProduct>;
        const filter = fixture.debugElement.query(By.directive(UiFilter)).componentInstance as UiFilter;

        expect(filter.filters.map((field) => field.header)).toEqual(['Arquivado']);
        expect(
            Array.from(fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLElement>)
                .slice(0, 5)
                .map((cell) => cell.textContent?.trim())
        ).toEqual(['Nome', 'Modelo', 'Marca', 'EAN', 'Arquivado']);
        expect(fixture.nativeElement.querySelector('tbody tr td:nth-child(5)')?.textContent.trim()).toBe('Não');
        expect(table.getRowActions(PRODUCT).length).toBe(2);
        filter.advancedValues['archived'] = 'true';
        filter.onAdvancedChange();
        const request = controller.expectOne((request) => request.url === '/api/v1/products/');

        expect(request.request.params.get('archived')).toBe('true');
        request.flush({ data: [{ ...PRODUCT, is_archived: true }], total_records: 1 });
        await fixture.whenStable();
        fixture.detectChanges();
        expect(table.getRowActions(table.tableValue[0])).toEqual([]);
        expect(fixture.nativeElement.querySelector('tbody tr td:nth-child(5)')?.textContent.trim()).toBe('Sim');
        expect(fixture.nativeElement.querySelector('.ui-table-actions-col button')).toBeNull();
        fixture.componentInstance.archive(table.tableValue[0]);
        controller.expectNone((request) => request.method === 'DELETE');
        controller.verify();
    });

    it('usa a rota da API com o identificador codificado', () => {
        const { controller } = configure();

        TestBed.inject(ProdutosService).update('../x', { name: 'A', model: 'B', brand: '', ean: '' }).subscribe();
        const request = controller.expectOne('/api/v1/products/..%2Fx/');

        expect(request.request.method).toBe('PATCH');
        expect(request.request.headers.get('X-Organization-Id')).toBe(ORG_ID);
        request.flush(PRODUCT);
    });

    it('cria com textos aparados e volta para a lista', () => {
        const { controller } = configure();
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const page = TestBed.createComponent(ProdutoFormPage).componentInstance;

        page.ngOnInit();
        page.form.setValue({ name: '  Impressora EcoTank ', model: ' L3250 ', brand: ' Epson ', ean: '' });
        page.save();
        const request = controller.expectOne('/api/v1/products/');

        expect(request.request.body).toEqual({ name: 'Impressora EcoTank', model: 'L3250', brand: 'Epson', ean: '' });
        request.flush(PRODUCT, { status: 201, statusText: 'Created' });
        expect(navigate).toHaveBeenCalledWith('/pages/pesquisa-precos/produtos');
    });

    it('exige nome e modelo sem chamar a API', () => {
        const { controller } = configure();
        const page = TestBed.createComponent(ProdutoFormPage).componentInstance;

        page.ngOnInit();
        page.save();
        expect(page.form.controls.name.touched).toBeTrue();
        expect(page.errorMessage('model')).toBe('Informe o modelo do produto.');
        controller.verify();
    });

    it('mostra o erro 422 junto ao campo e limpa ao editar', () => {
        const { controller } = configure();
        const page = TestBed.createComponent(ProdutoFormPage).componentInstance;

        page.ngOnInit();
        page.form.setValue({ name: 'Impressora EcoTank', model: 'L3250', brand: '', ean: '123' });
        page.save();
        controller.expectOne('/api/v1/products/').flush(problem422({ name: ['Já existe um produto com este nome e modelo no contrato.'], ean: ['Informe um EAN com 8 ou 13 dígitos.'] }), {
            status: 422,
            statusText: 'Unprocessable Entity'
        });

        expect(page.form.controls.ean.invalid).toBeTrue();
        expect(page.errorMessage('ean')).toBe('Informe um EAN com 8 ou 13 dígitos.');
        expect(page.errorMessage('name')).toBe('Já existe um produto com este nome e modelo no contrato.');
        page.form.controls.ean.setValue('96385074');
        expect(page.errorMessage('ean')).toBe('');
        expect(page.form.controls.ean.valid).toBeTrue();
    });

    it('volta para a lista sem chamar a API quando o id da rota não é UUID', () => {
        const { controller } = configure('..%2F..%2Fadmin');
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const page = TestBed.createComponent(ProdutoFormPage).componentInstance;

        page.ngOnInit();
        expect(page.isEditing).toBeFalse();
        expect(navigate).toHaveBeenCalledWith('/pages/pesquisa-precos/produtos');
        controller.verify();
    });
});
