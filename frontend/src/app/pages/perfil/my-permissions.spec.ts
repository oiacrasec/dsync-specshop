import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { needsOrganizationHeader } from '@/app/core/utils/api-url';
import { MyAccess } from '@/app/types/profile';
import { MyPermissions } from './my-permissions';
import { PerfilPage } from './perfil';

const MAIN = '019a0000-0000-7000-8000-000000000001';
const BRANCH = '019a0000-0000-7000-8000-000000000002';
const CATALOG = [
    {
        resource: 'organization',
        label: 'Organizações',
        permissions: [
            { code: 'organization:view', action: 'view', label: 'Visualizar', scopes: ['CONTRACT'], reserved: false },
            { code: 'organization:create', action: 'create', label: 'Criar', scopes: ['CONTRACT'], reserved: false },
            { code: 'organization:update', action: 'update', label: 'Editar', scopes: ['CONTRACT'], reserved: false }
        ]
    }
];
const ACCESS: MyAccess = {
    organizations: [
        { public_id: BRANCH, name: 'Filial Norte', profiles: [], permissions: ['organization:view'], all_permissions: false },
        { public_id: MAIN, name: 'Organização Principal', profiles: [{ public_id: 'p1', name: 'Leitor' }], permissions: ['organization:view', 'organization:update'], all_permissions: false }
    ]
};

function configure() {
    TestBed.configureTestingModule({
        providers: [
            provideZonelessChangeDetection(),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideRouter([]),
            MessageService,
            { provide: API_BASE_URL, useValue: '/api/v1' },
            { provide: AuthSessionService, useValue: { getUser: () => null } },
            { provide: UserContextService, useValue: { getActiveContext: () => ({ organization_public_id: MAIN }) } }
        ]
    });

    return TestBed.inject(HttpTestingController);
}

function load(controller: HttpTestingController, access = ACCESS) {
    const request = controller.expectOne('/api/v1/me/access/');

    expect(request.request.method).toBe('GET');
    request.flush(access);
    controller.expectOne('/api/v1/permissions/').flush(CATALOG);
}

describe('Minhas permissões', () => {
    afterEach(() => {
        TestBed.inject(HttpTestingController).verify();
        TestBed.resetTestingModule();
    });

    it('abre a organização atual, mostra só as ações concedidas e não oferece edição', () => {
        const controller = configure();
        const fixture = TestBed.createComponent(MyPermissions);

        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Carregando suas permissões');
        load(controller);
        fixture.detectChanges();
        const details = fixture.nativeElement.querySelectorAll('details') as NodeListOf<HTMLDetailsElement>;

        expect(details.length).toBe(2);
        expect(details[0].open).toBeTrue();
        expect(details[0].querySelector('summary')?.textContent).toContain('Organização Principal');
        expect(details[0].querySelector('summary')?.textContent).toContain('Atual');
        expect(details[1].open).toBeFalse();
        expect(details[0].textContent).toContain('Leitor');
        expect(details[0].textContent).toContain('Visualizar');
        expect(details[0].textContent).toContain('Editar');
        expect(details[0].textContent).not.toContain('Criar');
        expect(details[1].textContent).toContain('Acesso por permissões avulsas');
        expect(fixture.nativeElement.querySelectorAll('input, select, textarea, button').length).toBe(0);
        details[1].querySelector('summary')!.click();
        expect(details[1].open).toBeTrue();
        fixture.detectChanges();
        expect(details[1].open).toBeTrue();
        controller.expectNone('/api/v1/me/access/');
        expect(needsOrganizationHeader('/me/access/', false)).toBeFalse();
        expect(needsOrganizationHeader('/me/permissions/', false)).toBeTrue();
    });

    it('mostra acesso total para o administrador sem repetir a grade', () => {
        const controller = configure();
        const fixture = TestBed.createComponent(MyPermissions);

        fixture.detectChanges();
        load(controller, { organizations: [{ ...ACCESS.organizations[1], all_permissions: true, profiles: [{ public_id: 'admin', name: 'Administrador do contrato' }] }] });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Seu acesso como administrador do contrato');
        expect(fixture.nativeElement.textContent).toContain('inclusive as adicionadas depois');
        expect(fixture.nativeElement.querySelector('dl')).toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('fale com o administrador');
    });

    it('trata organização sem permissões e conta sem organizações', () => {
        const controller = configure();
        const fixture = TestBed.createComponent(MyPermissions);

        fixture.detectChanges();
        load(controller, { organizations: [{ ...ACCESS.organizations[1], permissions: [] }] });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Nenhuma permissão concedida nesta organização');
        fixture.componentInstance.load();
        controller.expectOne('/api/v1/me/access/').flush({ organizations: [] });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Você não tem acesso a nenhuma organização');
    });

    it('oferece nova tentativa após falha e evita pedidos simultâneos', () => {
        const controller = configure();
        const fixture = TestBed.createComponent(MyPermissions);

        fixture.detectChanges();
        controller.expectOne('/api/v1/permissions/').flush(CATALOG);
        fixture.componentInstance.load();
        controller.expectOne('/api/v1/me/access/').flush({}, { status: 503, statusText: 'Unavailable' });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
        fixture.nativeElement.querySelector('button').click();
        controller.expectOne('/api/v1/me/access/').flush(ACCESS);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('details').length).toBe(2);
    });

    it('cancela a consulta ao destruir o componente', () => {
        const controller = configure();
        const fixture = TestBed.createComponent(MyPermissions);

        fixture.detectChanges();
        const request = controller.expectOne('/api/v1/me/access/');

        controller.expectOne('/api/v1/permissions/').flush(CATALOG);
        fixture.destroy();
        expect(request.cancelled).toBeTrue();
    });

    it('busca ao abrir a aba pela primeira vez e reutiliza o resultado ao voltar', () => {
        const controller = configure();
        const fixture = TestBed.createComponent(PerfilPage);

        fixture.detectChanges();
        controller.expectOne('/api/v1/me/profile/').flush({ username: 'maria', name: 'Maria', time_zone: 'America/Sao_Paulo', avatar_url: '' });
        controller.expectNone('/api/v1/me/access/');
        fixture.componentInstance.onTabChange('permissoes');
        fixture.detectChanges();
        load(controller);
        fixture.detectChanges();
        fixture.componentInstance.onTabChange('principal');
        fixture.detectChanges();
        fixture.componentInstance.onTabChange('permissoes');
        fixture.detectChanges();
        controller.expectNone('/api/v1/me/access/');
        expect(fixture.nativeElement.textContent).toContain('Organização Principal');
        const tabs = [...fixture.nativeElement.querySelectorAll('[role=tab]')] as HTMLElement[];

        expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Principal', 'Senha', 'Verificação em duas etapas', 'Minhas permissões', 'Sessões']);
    });

    it('oculta a aba e não consulta o acesso do superadmin', () => {
        const controller = configure();

        spyOn(TestBed.inject(AuthSessionService), 'getUser').and.returnValue({ is_superuser: true } as ReturnType<AuthSessionService['getUser']>);
        const fixture = TestBed.createComponent(PerfilPage);

        fixture.detectChanges();
        controller.expectOne('/api/v1/me/profile/').flush({ username: 'root', name: 'Root', time_zone: 'America/Sao_Paulo', avatar_url: '' });
        fixture.componentInstance.onTabChange('permissoes');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).not.toContain('Minhas permissões');
        controller.expectNone('/api/v1/me/access/');
        controller.expectNone('/api/v1/permissions/');
    });
});
