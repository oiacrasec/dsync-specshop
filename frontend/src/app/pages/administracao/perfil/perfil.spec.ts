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
import { PermissionGrid } from '@/app/shared/ui/permission-grid/permission-grid';
import { LoginResponse } from '@/app/types/auth';
import { PermissionCatalogGroup } from '@/app/types/permission';
import { PerfilFormPage } from './formulario/formulario';
import { PerfilPage } from './perfil';
import { PerfilService } from './perfil.service';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const ORG_ID = '019a0000-0000-7000-8000-000000000002';
const PROFILE_ID = '019a0000-0000-7000-8000-000000000003';
const PROFILE = { public_id: PROFILE_ID, name: 'Leitor', is_active: true, permissions: ['user:view'], is_system: false, is_essential: false, created_at: '', updated_at: '' };
const CATALOG: PermissionCatalogGroup[] = [
    {
        resource: 'user',
        label: 'Usuários',
        permissions: [
            { code: 'user:view', action: 'view', label: 'Visualizar', scopes: ['CONTRACT'], reserved: false },
            { code: 'user:manage', action: 'manage', label: 'Gerenciar', scopes: ['CONTRACT'], reserved: true }
        ]
    },
    { resource: 'assignment', label: 'Atribuições', permissions: [{ code: 'assignment:create', action: 'create', label: 'Criar', scopes: ['CONTRACT'], reserved: true }] }
];

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
    contexts.setActiveContext({ organization_public_id: ORG_ID, organization_name: 'Matriz' });

    return { controller: TestBed.inject(HttpTestingController), permissions: TestBed.inject(PermissionContextService) };
}

describe('Perfis na área do cliente', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
    });

    it('mostra criar, editar e excluir conforme as permissões', () => {
        const { controller, permissions } = configure();

        permissions.loadForCurrentContext().subscribe();
        controller.expectOne('/api/v1/me/permissions/').flush({ permissions: ['profile:view', 'profile:delete'] });
        const page = TestBed.createComponent(PerfilPage).componentInstance;

        page.ngOnInit();
        expect(page.canCreate).toBeFalse();
        expect(page.tableActions.map((action) => action.id)).toEqual(['delete']);
    });

    it('usa as rotas do Core com o identificador codificado', () => {
        const { controller } = configure();

        TestBed.inject(PerfilService).remove('../x').subscribe();
        const request = controller.expectOne('/api/v1/profiles/..%2Fx/');

        expect(request.request.method).toBe('DELETE');
        expect(request.request.headers.get('X-Organization-Id')).toBe(ORG_ID);
        request.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('cria o perfil com as permissões marcadas e volta para a lista', () => {
        const { controller } = configure();
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const page = TestBed.createComponent(PerfilFormPage).componentInstance;

        page.ngOnInit();
        controller.expectOne('/api/v1/permissions/').flush(CATALOG);
        page.form.setValue({ name: ' Leitor ', is_active: true });
        page.permissions.set(['user:view']);
        page.save();
        const request = controller.expectOne('/api/v1/profiles/');

        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ name: 'Leitor', is_active: true, permissions: ['user:view'] });
        request.flush(PROFILE, { status: 201, statusText: 'Created' });
        expect(navigate).toHaveBeenCalledWith('/pages/administracao/perfil');
    });

    it('abre perfil do sistema só para leitura e não envia alterações', () => {
        const { controller } = configure(PROFILE_ID);
        const page = TestBed.createComponent(PerfilFormPage).componentInstance;

        page.ngOnInit();
        controller.expectOne('/api/v1/permissions/').flush(CATALOG);
        controller.expectOne(`/api/v1/profiles/${PROFILE_ID}/`).flush({ ...PROFILE, name: 'Administrador do contrato', is_system: true, is_essential: true, permissions: ['assignment:create', 'user:manage', 'user:view'] });
        expect(page.readOnly()).toBeTrue();
        expect(page.essential()).toBeTrue();
        expect(page.form.disabled).toBeTrue();
        page.save();
        controller.verify();
    });

    it('volta para a lista sem buscar o perfil quando o id da rota não é UUID', () => {
        const { controller } = configure('..%2Fadmin');
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const page = TestBed.createComponent(PerfilFormPage).componentInstance;

        page.ngOnInit();
        controller.expectOne('/api/v1/permissions/').flush(CATALOG);
        expect(navigate).toHaveBeenCalledWith('/pages/administracao/perfil');
        controller.verify();
    });
});

describe('Grade de permissões', () => {
    beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));
    afterEach(() => TestBed.resetTestingModule());

    it('esconde as permissões reservadas e os recursos que ficam vazios', () => {
        const fixture = TestBed.createComponent(PermissionGrid);

        fixture.componentRef.setInput('groups', CATALOG);
        expect(fixture.componentInstance.visibleGroups().map((group) => group.permissions.map((item) => item.code))).toEqual([['user:view']]);
        fixture.componentRef.setInput('includeReserved', true);
        expect(fixture.componentInstance.visibleGroups().length).toBe(2);
    });

    it('emite a seleção ordenada ao marcar e desmarcar', () => {
        const fixture = TestBed.createComponent(PermissionGrid);
        const emitted: string[][] = [];

        fixture.componentRef.setInput('selected', ['user:view']);
        fixture.componentInstance.selectedChange.subscribe((codes) => emitted.push(codes));
        fixture.componentInstance.toggle('organization:view', true);
        fixture.componentInstance.toggle('user:view', false);
        expect(emitted).toEqual([['organization:view', 'user:view'], []]);
    });
});
