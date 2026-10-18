import { formatDate, registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { UiLookupOptionsResponse } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiTableListResponse } from '@/app/shared/ui/table/table';
import { Contract, ContractAdmin } from '@/app/types/contrato';
import { TableSchema } from '@/app/types/table-schema';
import { ContratoService } from './contrato.service';
import { ContratoFormPage } from './formulario/formulario';

const CONTRACT_ID = '019a0000-0000-7000-8000-0000000000c1';
const PLAN_ID = '019a0000-0000-7000-8000-0000000000p1';
const ADMIN_ID = '019a0000-0000-7000-8000-0000000000a1';

const SCHEMA: TableSchema = {
    columns: [
        { field: 'name', label: 'Nome', type: 'text' },
        { field: 'start_date', label: 'Início', type: 'date' },
        { field: 'licenses', label: 'Licenças', type: 'number' }
    ],
    filters: [
        { field: 'is_active', label: 'Ativo', type: 'boolean' },
        { field: 'plan', label: 'Plano', type: 'relation', options_url: '/api/v1/admin/plans/options/' }
    ],
    general_search: { parameter: 'search', label: 'Busca geral', fields: [{ field: 'name', label: 'Nome', lookup: 'icontains' }] },
    ordering_fields: ['name', 'start_date', 'licenses', 'created_at']
};

const CONTRACT: Contract = {
    public_id: CONTRACT_ID,
    name: 'Cliente',
    plan: null,
    start_date: '2026-01-01',
    end_date: null,
    licenses: 5,
    post_termination_retention_days: 90,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
};

const ADMIN: ContractAdmin = { public_id: ADMIN_ID, username: 'maria', name: 'Maria', is_active: true, must_change_password: false };

function configure(routeId: string | null = null) {
    TestBed.configureTestingModule({
        providers: [
            provideZonelessChangeDetection(),
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
            { provide: API_BASE_URL, useValue: '/api/v1' },
            {
                provide: ActivatedRoute,
                useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}), queryParamMap: convertToParamMap({}) } }
            },
            MessageService
        ]
    });
}

describe('ContratoService (API do Core)', () => {
    let controller: HttpTestingController;
    let service: ContratoService;

    beforeEach(() => {
        configure();
        controller = TestBed.inject(HttpTestingController);
        service = TestBed.inject(ContratoService);
    });

    afterEach(() => {
        controller.verify();
        TestBed.resetTestingModule();
    });

    it('adapta listagem e schema ao ui-table, buscando o schema uma única vez', () => {
        const results: UiTableListResponse<Contract>[] = [];

        service.list({ first: 0, rows: 20, ordering: '-name', search: 'cli' }).subscribe((value) => results.push(value));
        controller.expectOne('/api/v1/admin/contracts/schema/').flush(SCHEMA);
        const list = controller.expectOne((request) => request.url === '/api/v1/admin/contracts/');

        expect(list.request.params.get('first')).toBe('0');
        expect(list.request.params.get('rows')).toBe('20');
        expect(list.request.params.get('ordering')).toBe('-name');
        expect(list.request.params.get('search')).toBe('cli');
        list.flush({ data: [CONTRACT], total_records: 57 });

        expect(results[0].data).toEqual([CONTRACT]);
        expect(results[0].totalRecords).toBe(57);
        expect(results[0].columns).toEqual([
            { field: 'name', header: 'Nome', sortable: true },
            { field: 'start_date', header: 'Início', sortable: true, type: 'date' },
            { field: 'licenses', header: 'Licenças', sortable: true }
        ]);
        expect(results[0].filters).toEqual([
            { field: 'name', header: 'Nome', type: 'text', placement: 'general' },
            { field: 'is_active', header: 'Ativo', type: 'boolean', placement: 'advanced' },
            { field: 'plan', header: 'Plano', type: 'relation', placement: 'advanced', lookup: { endpoint: '/api/v1/admin/plans/options/' } }
        ]);

        service.list({ first: 20, rows: 20 }).subscribe((value) => results.push(value));
        controller.expectNone('/api/v1/admin/contracts/schema/');
        controller.expectOne((request) => request.url === '/api/v1/admin/contracts/').flush({ data: [], total_records: 57 });
        expect(results.length).toBe(2);
    });

    it('formata datas do schema no padrão pt-BR, sem deslocar o dia pelo fuso', () => {
        registerLocaleData(localePt, 'pt-BR');

        expect(formatDate('2026-10-01', 'shortDate', 'pt-BR')).toBe('01/10/2026');
        expect(formatDate('2026-10-01T13:45:00', 'short', 'pt-BR')).toBe('01/10/2026 13:45');
    });

    it('busca planos por texto e resolve rótulos por public_id', () => {
        const results: UiLookupOptionsResponse[] = [];

        service.planOptions({ q: 'pre', first: 0, rows: 20 }).subscribe((value) => results.push(value));
        const search = controller.expectOne((request) => request.url === '/api/v1/admin/plans/options/');

        expect(search.request.params.get('q')).toBe('pre');
        expect(search.request.params.has('public_id')).toBeFalse();
        search.flush({ data: [{ value: PLAN_ID, label: 'Premium' }], total_records: 1, has_next: false });
        expect(results[0]).toEqual({ data: [{ value: PLAN_ID, label: 'Premium' }], totalRecords: 1, first: 0, rows: 20, hasNext: false });

        service.planOptions({ pk: PLAN_ID, first: 0, rows: 1 }).subscribe();
        const resolve = controller.expectOne((request) => request.url === '/api/v1/admin/plans/options/');

        expect(resolve.request.params.get('public_id')).toBe(PLAN_ID);
        expect(resolve.request.params.has('pk')).toBeFalse();
        expect(resolve.request.params.has('q')).toBeFalse();
        resolve.flush({ data: [], total_records: 0, has_next: false });
    });

    it('codifica os identificadores no caminho da API', () => {
        service.get('../plans').subscribe();
        controller.expectOne('/api/v1/admin/contracts/..%2Fplans/').flush(CONTRACT);
        service.resetAdminPassword(CONTRACT_ID, '../x').subscribe();
        controller.expectOne(`/api/v1/admin/contracts/${CONTRACT_ID}/admins/..%2Fx/reset-password/`).flush({});
    });

    it('usa as rotas do Core para provisionamento, admins e reset', () => {
        service.provision(CONTRACT_ID, { organization_name: 'Matriz', username: 'maria', name: 'Maria' }).subscribe();
        const provision = controller.expectOne(`/api/v1/admin/contracts/${CONTRACT_ID}/provision/`);

        expect(provision.request.method).toBe('POST');
        expect(provision.request.body).toEqual({ organization_name: 'Matriz', username: 'maria', name: 'Maria' });
        provision.flush({});

        service.admins(CONTRACT_ID).subscribe();
        const admins = controller.expectOne((request) => request.url === `/api/v1/admin/contracts/${CONTRACT_ID}/admins/`);

        expect(admins.request.params.get('rows')).toBe('100');
        admins.flush({ data: [], total_records: 0 });

        service.resetAdminPassword(CONTRACT_ID, ADMIN_ID).subscribe();
        const reset = controller.expectOne(`/api/v1/admin/contracts/${CONTRACT_ID}/admins/${ADMIN_ID}/reset-password/`);

        expect(reset.request.method).toBe('POST');
        reset.flush({});
    });
});

describe('ContratoFormPage', () => {
    let controller: HttpTestingController;

    afterEach(() => {
        controller.verify();
        TestBed.resetTestingModule();
    });

    it('cria contrato sem plano, com retenção padrão, e abre o primeiro acesso', () => {
        configure();
        controller = TestBed.inject(HttpTestingController);
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const page = TestBed.createComponent(ContratoFormPage).componentInstance;

        page.ngOnInit();
        page.form.patchValue({ name: ' Cliente ', start_date: '2026-01-01', licenses: 5 });

        page.save();
        const request = controller.expectOne('/api/v1/admin/contracts/');

        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({
            name: 'Cliente',
            plan: null,
            start_date: '2026-01-01',
            end_date: null,
            licenses: 5,
            post_termination_retention_days: 90,
            is_active: true
        });
        request.flush(CONTRACT);
        expect(navigate).toHaveBeenCalledWith(['/pages/administracao/contrato', CONTRACT_ID], { queryParams: { tab: 'primeiro-acesso' } });
    });

    it('volta para a lista sem chamar a API quando o id da rota não é UUID', () => {
        configure('..%2F..%2Fplans');
        controller = TestBed.inject(HttpTestingController);
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const page = TestBed.createComponent(ContratoFormPage).componentInstance;

        page.ngOnInit();

        expect(page.isEditing).toBeFalse();
        expect(navigate).toHaveBeenCalledWith('/pages/administracao/contrato');
    });

    it('rejeita retenção acima de 365 dias sem chamar a API', () => {
        configure();
        controller = TestBed.inject(HttpTestingController);
        const page = TestBed.createComponent(ContratoFormPage).componentInstance;

        page.form.patchValue({ name: 'Cliente', start_date: '2026-01-01', post_termination_retention_days: 366 });

        page.save();
        expect(page.form.controls.post_termination_retention_days.invalid).toBeTrue();
    });

    it('provisiona, mostra a senha uma vez e recarrega os admins', () => {
        configure(CONTRACT_ID);
        controller = TestBed.inject(HttpTestingController);
        const page = TestBed.createComponent(ContratoFormPage).componentInstance;

        page.ngOnInit();
        controller.expectOne(`/api/v1/admin/contracts/${CONTRACT_ID}/`).flush(CONTRACT);
        controller.expectOne((request) => request.url === `/api/v1/admin/contracts/${CONTRACT_ID}/admins/`).flush({ data: [], total_records: 0 });
        expect(page.showProvisionTab).toBeTrue();
        expect(page.provisionForm.controls.organization_name.value).toBe('Cliente - Organização Principal');

        page.activeTab = 'primeiro-acesso';
        page.provisionForm.patchValue({ username: 'maria', name: 'Maria' });
        page.provision();
        const provision = controller.expectOne(`/api/v1/admin/contracts/${CONTRACT_ID}/provision/`);
        const result = {
            organization: { public_id: '019a0000-0000-7000-8000-0000000000o1', name: 'Cliente - Organização Principal' },
            user: { public_id: ADMIN_ID, username: 'maria', name: 'Maria', is_superuser: false, must_change_password: true },
            temporary_password: 'Temp-Password-16'
        };

        provision.flush(result, { status: 201, statusText: 'Created' });
        expect(page.provisionResult).toEqual(result);
        expect(page.provisionForm.controls.username.value).toBe('');

        controller.expectOne((request) => request.url === `/api/v1/admin/contracts/${CONTRACT_ID}/admins/`).flush({ data: [{ ...ADMIN, must_change_password: true }], total_records: 1 });
        expect(page.showAdminsTab).toBeTrue();
        expect(page.activeTab).toBe('administradores');
    });

    it('mostra o detalhe RFC 9457 quando o contrato não pode ser provisionado', () => {
        configure(CONTRACT_ID);
        controller = TestBed.inject(HttpTestingController);
        const messages = TestBed.inject(MessageService);
        const add = spyOn(messages, 'add');
        const page = TestBed.createComponent(ContratoFormPage).componentInstance;

        page.ngOnInit();
        controller.expectOne(`/api/v1/admin/contracts/${CONTRACT_ID}/`).flush(CONTRACT);
        controller.expectOne((request) => request.url === `/api/v1/admin/contracts/${CONTRACT_ID}/admins/`).flush({ data: [], total_records: 0 });

        page.provisionForm.patchValue({ username: 'maria', name: 'Maria' });
        page.provision();
        const detail = 'O provisionamento exige contrato disponível, sem usuários e sem organizações.';

        controller
            .expectOne(`/api/v1/admin/contracts/${CONTRACT_ID}/provision/`)
            .flush({ type: 'urn:datasync:problem:contract-not-provisionable', status: 409, title: 'Contrato não pode ser provisionado', detail, instance: '/x', request_id: 'r' }, { status: 409, statusText: 'Conflict' });
        expect(page.provisionResult).toBeNull();
        expect(add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail }));
    });

    it('só redefine a senha do admin depois da confirmação', () => {
        configure(CONTRACT_ID);
        controller = TestBed.inject(HttpTestingController);
        const fixture = TestBed.createComponent(ContratoFormPage);
        const page = fixture.componentInstance;
        const confirmations = fixture.debugElement.injector.get(ConfirmationService);
        let accept: (() => void) | undefined;

        spyOn(confirmations, 'confirm').and.callFake((options) => {
            accept = options.accept as () => void;

            return confirmations;
        });
        page.ngOnInit();
        controller.expectOne(`/api/v1/admin/contracts/${CONTRACT_ID}/`).flush(CONTRACT);
        controller.expectOne((request) => request.url === `/api/v1/admin/contracts/${CONTRACT_ID}/admins/`).flush({ data: [ADMIN], total_records: 1 });

        page.confirmResetPassword(ADMIN);
        controller.expectNone(`/api/v1/admin/contracts/${CONTRACT_ID}/admins/${ADMIN_ID}/reset-password/`);

        accept?.();
        const reset = controller.expectOne(`/api/v1/admin/contracts/${CONTRACT_ID}/admins/${ADMIN_ID}/reset-password/`);

        reset.flush({ user: { ...ADMIN, must_change_password: true }, temporary_password: 'Reset-Password-16' });
        expect(page.resetResult?.temporary_password).toBe('Reset-Password-16');
        expect(page.admins[0].must_change_password).toBeTrue();
    });
});
