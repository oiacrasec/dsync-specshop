import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { authInterceptor } from '@/app/core/interceptors/auth.interceptor';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { CONTEXT_KEY, SESSION_KEY } from '@/app/core/utils/session-data';
import { LoginResponse } from '@/app/types/auth';
import { Organization } from '@/app/types/organizacao';
import { OrganizacaoFormPage } from './formulario/formulario';
import { OrganizacaoPage } from './organizacao';
import { OrganizacaoService } from './organizacao.service';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const ORG_ID = '019a0000-0000-7000-8000-000000000002';
const OTHER_ID = '019a0000-0000-7000-8000-000000000003';
const ORG: Organization = { public_id: ORG_ID, name: 'Matriz', is_active: true, created_at: '', updated_at: '' };

function login(superuser = false): LoginResponse {
    const token = `e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;

    return { access: token, refresh: token, user: { public_id: USER_ID, username: 'maria', name: 'Maria', is_superuser: superuser, must_change_password: false } };
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
    const session = TestBed.inject(AuthSessionService);

    session.setSession(login());
    const contexts = TestBed.inject(UserContextService);

    spyOn(contexts, 'reloadPage');
    contexts.setActiveContext({ organization_public_id: ORG_ID, organization_name: 'Matriz' });

    return { controller: TestBed.inject(HttpTestingController), contexts, permissions: TestBed.inject(PermissionContextService) };
}

function flushPermissions(controller: HttpTestingController, codes: string[]) {
    const request = controller.expectOne('/api/v1/me/permissions/');

    expect(request.request.headers.get('X-Organization-Id')).toBe(ORG_ID);
    request.flush({ permissions: codes });
}

describe('Organizações na área do cliente', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
    });

    it('carrega as permissões uma vez por organização e nega por padrão', () => {
        const { controller, permissions } = configure();

        expect(permissions.hasPermission('organization:view')).toBeFalse();
        permissions.loadForCurrentContext().subscribe();
        permissions.loadForCurrentContext().subscribe();
        flushPermissions(controller, ['organization:view']);
        permissions.loadForCurrentContext().subscribe();
        controller.expectNone('/api/v1/me/permissions/');
        expect(permissions.hasPermission('organization:view')).toBeTrue();
        expect(permissions.hasPermission('organization:delete')).toBeFalse();
        expect(permissions.hasAllPermissions(['organization:view', 'organization:delete'])).toBeFalse();

        permissions.clearCache();
        expect(permissions.hasPermission('organization:view')).toBeFalse();
        controller.verify();
    });

    it('superadmin não consulta o resumo de permissões', () => {
        const { controller, permissions } = configure();

        TestBed.inject(AuthSessionService).setSession(login(true));
        permissions.loadForCurrentContext().subscribe();
        controller.expectNone('/api/v1/me/permissions/');
        controller.verify();
    });

    it('mostra criar, editar e excluir conforme as permissões', () => {
        const { controller, permissions } = configure();

        permissions.loadForCurrentContext().subscribe();
        flushPermissions(controller, ['organization:view', 'organization:update']);
        const page = TestBed.createComponent(OrganizacaoPage).componentInstance;

        page.ngOnInit();
        expect(page.canCreate).toBeFalse();
        expect(page.tableActions.map((action) => action.id)).toEqual(['edit']);
    });

    it('usa a rota do Core com o identificador codificado', () => {
        const { controller } = configure();
        const service = TestBed.inject(OrganizacaoService);

        service.update('../x', { name: 'Filial', is_active: true }).subscribe();
        const request = controller.expectOne('/api/v1/organizations/..%2Fx/');

        expect(request.request.method).toBe('PATCH');
        expect(request.request.headers.get('X-Organization-Id')).toBe(ORG_ID);
        request.flush(ORG);
    });

    it('cria com nome aparado e volta para a lista', () => {
        const { controller } = configure();
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const page = TestBed.createComponent(OrganizacaoFormPage).componentInstance;

        page.ngOnInit();
        page.form.setValue({ name: '  Filial  ', is_active: true });
        page.save();
        const request = controller.expectOne('/api/v1/organizations/');

        expect(request.request.body).toEqual({ name: 'Filial', is_active: true });
        request.flush({ ...ORG, public_id: OTHER_ID, name: 'Filial' }, { status: 201, statusText: 'Created' });
        expect(navigate).toHaveBeenCalledWith('/pages/administracao/organizacao');
    });

    it('renomear a organização ativa atualiza o nome do contexto', () => {
        const { controller, contexts } = configure(ORG_ID);
        const page = TestBed.createComponent(OrganizacaoFormPage).componentInstance;

        page.ngOnInit();
        controller.expectOne(`/api/v1/organizations/${ORG_ID}/`).flush(ORG);
        page.form.patchValue({ name: 'Matriz SP' });
        page.save();
        controller.expectOne(`/api/v1/organizations/${ORG_ID}/`).flush({ ...ORG, name: 'Matriz SP' });
        expect(contexts.getActiveContext()?.organization_name).toBe('Matriz SP');
    });

    it('mostra o detalhe RFC 9457 quando não pode desativar a última organização', () => {
        const { controller } = configure(ORG_ID);
        const add = spyOn(TestBed.inject(MessageService), 'add');
        const page = TestBed.createComponent(OrganizacaoFormPage).componentInstance;

        page.ngOnInit();
        controller.expectOne(`/api/v1/organizations/${ORG_ID}/`).flush(ORG);
        page.form.patchValue({ is_active: false });
        page.save();
        const detail = 'O contrato precisa manter pelo menos uma organização ativa.';

        controller
            .expectOne(`/api/v1/organizations/${ORG_ID}/`)
            .flush({ type: 'urn:dsync:problem:last-active-organization', status: 409, title: 'Última organização ativa', detail, instance: '/x', request_id: 'r' }, { status: 409, statusText: 'Conflict' });
        expect(add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail }));
    });

    it('volta para a lista sem chamar a API quando o id da rota não é UUID', () => {
        const { controller } = configure('..%2F..%2Fadmin');
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const page = TestBed.createComponent(OrganizacaoFormPage).componentInstance;

        page.ngOnInit();
        expect(page.isEditing).toBeFalse();
        expect(navigate).toHaveBeenCalledWith('/pages/administracao/organizacao');
        controller.verify();
    });
});
