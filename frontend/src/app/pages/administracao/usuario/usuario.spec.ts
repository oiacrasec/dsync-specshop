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
import { UsuarioFormPage } from './formulario/formulario';
import { ALL_ORGANIZATIONS } from './permissoes/permissoes';
import { UsuarioPage } from './usuario';
import { UsuarioService } from './usuario.service';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const ORG_ID = '019a0000-0000-7000-8000-000000000002';
const OTHER_ID = '019a0000-0000-7000-8000-000000000003';
const ESSENTIAL = { public_id: '019a0000-0000-7000-8000-000000000009', name: 'Administrador do contrato', is_active: true, is_system: true, is_essential: true, permissions: ['user:view'] };
const USER = { public_id: OTHER_ID, username: 'joao', name: 'João', is_active: true, must_change_password: true, created_at: '', updated_at: '' };

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

describe('Usuários na área do cliente', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
    });

    it('mostra criar, editar, excluir e redefinir senha conforme as permissões', () => {
        const { controller, permissions } = configure();

        permissions.loadForCurrentContext().subscribe();
        flushPermissions(controller, ['user:view', 'user:update', 'user:manage']);
        const page = TestBed.createComponent(UsuarioPage).componentInstance;

        page.ngOnInit();
        expect(page.canCreate).toBeFalse();
        expect(page.tableActions.map((action) => action.id)).toEqual(['edit', 'reset-password']);
    });

    it('usa as rotas do Core com o identificador codificado', () => {
        const { controller } = configure();
        const service = TestBed.inject(UsuarioService);

        service.resetPassword('../x').subscribe();
        const request = controller.expectOne('/api/v1/users/..%2Fx/reset-password/');

        expect(request.request.method).toBe('POST');
        expect(request.request.headers.get('X-Organization-Id')).toBe(ORG_ID);
        request.flush({ user: USER, temporary_password: 'Temp-Password-16' });
    });

    it('cria o usuário e mostra a senha temporária uma vez, sem sair da tela', () => {
        const { controller } = configure();
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const page = TestBed.createComponent(UsuarioFormPage).componentInstance;

        page.ngOnInit();
        page.form.setValue({ username: ' joao ', name: ' João ', is_active: true });
        page.save();
        const request = controller.expectOne('/api/v1/users/');

        expect(request.request.body).toEqual({ username: 'joao', name: 'João', is_active: true });
        request.flush({ ...USER, temporary_password: 'Temp-Password-16' }, { status: 201, statusText: 'Created' });
        expect(page.created?.temporary_password).toBe('Temp-Password-16');
        expect(page.isEditing).toBeTrue();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('mostra o detalhe RFC 9457 do limite de licenças', () => {
        const { controller } = configure();
        const add = spyOn(TestBed.inject(MessageService), 'add');
        const page = TestBed.createComponent(UsuarioFormPage).componentInstance;

        page.form.setValue({ username: 'joao', name: 'João', is_active: true });
        page.save();
        const detail = 'O contrato não possui licenças disponíveis para cadastrar outro usuário.';

        controller.expectOne('/api/v1/users/').flush({ type: 'urn:datasync:problem:license-limit-reached', status: 409, title: 'Limite de licenças atingido', detail, instance: '/x', request_id: 'r' }, { status: 409, statusText: 'Conflict' });
        expect(add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail }));
        expect(page.created).toBeNull();
    });

    it('salva os dados e depois as permissões alteradas na aba', async () => {
        const { controller, permissions } = configure(OTHER_ID);
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

        permissions.loadForCurrentContext().subscribe();
        flushPermissions(controller, ['user:update', 'assignment:create', 'assignment:delete']);
        const fixture = TestBed.createComponent(UsuarioFormPage);
        const page = fixture.componentInstance;

        fixture.detectChanges();
        controller.expectOne(`/api/v1/users/${OTHER_ID}/`).flush(USER);
        controller.expectOne('/api/v1/permissions/').flush([]);
        controller.expectOne(`/api/v1/users/${OTHER_ID}/access/`).flush({ organizations: [], profiles: [ESSENTIAL], grants: [] });
        expect(page.canEditAccess()).toBeTrue();
        fixture.detectChanges();
        await fixture.whenStable();
        const editor = fixture.debugElement.query((element) => element.name === 'app-user-access').componentInstance;

        editor.select(ALL_ORGANIZATIONS);
        editor.selectedProfile = ESSENTIAL.public_id;
        editor.applyProfile();
        page.save();
        controller.expectOne(`/api/v1/users/${OTHER_ID}/`).flush(USER);
        const request = controller.expectOne(`/api/v1/users/${OTHER_ID}/access/`);

        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual({ grants: [{ scope: 'CONTRACT', organization: null, profile: ESSENTIAL.public_id, permission: '', excluded_organizations: [] }] });
        request.flush({ organizations: [], profiles: [ESSENTIAL], grants: [] });
        expect(navigate).toHaveBeenCalledWith('/pages/administracao/usuario');
    });

    it('volta para a lista sem chamar a API quando o id da rota não é UUID', () => {
        const { controller } = configure('..%2Fadmin');
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const page = TestBed.createComponent(UsuarioFormPage).componentInstance;

        page.ngOnInit();
        expect(navigate).toHaveBeenCalledWith('/pages/administracao/usuario');
        controller.verify();
    });
});
