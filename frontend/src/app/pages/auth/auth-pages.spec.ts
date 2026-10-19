import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { ACCESS_AUDIENCE, AccessAudience } from '@/app/core/tokens/access.types';
import { CONTEXT_KEY, SESSION_KEY } from '@/app/core/utils/session-data';
import { accessGuard } from '@/app/core/guards/access.guard';
import { LoginResponse } from '@/app/types/auth';
import { Login } from './login';
import { PrimeiroAcessoTrocarSenhaPage } from './primeiro-acesso-trocar-senha';
import { ContextoSelecaoPage } from './contexto-selecao';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const ORG_ID = '019a0000-0000-7000-8000-000000000002';
const OTHER_ORG_ID = '019a0000-0000-7000-8000-000000000003';
const TWO_ORGS = [
    { public_id: ORG_ID, name: 'Organização' },
    { public_id: OTHER_ORG_ID, name: 'Outra organização' }
];

function response(overrides: Partial<LoginResponse['user']> = {}): LoginResponse {
    const token = `e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;

    return { access: token, refresh: token, user: { public_id: USER_ID, username: 'tester', name: 'Teste', is_superuser: false, must_change_password: false, ...overrides } };
}

describe('Core auth pages and route guards', () => {
    let controller: HttpTestingController;
    let session: AuthSessionService;
    let contexts: UserContextService;
    let router: Router;
    let navigate: jasmine.Spy;

    beforeEach(() => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
        TestBed.configureTestingModule({
            providers: [
                provideZonelessChangeDetection(),
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: '/api/v1' },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '/kpi' } } } },
                MessageService
            ]
        });
        controller = TestBed.inject(HttpTestingController);
        contexts = TestBed.inject(UserContextService);
        spyOn(contexts, 'reloadPage');
        router = TestBed.inject(Router);
        navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
        session = TestBed.inject(AuthSessionService);
    });

    afterEach(() => {
        controller.verify();
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
    });

    it('routes a superadmin from login directly to the administrative home', () => {
        const page = TestBed.runInInjectionContext(() => new Login());

        page.form.setValue({ username: 'tester', password: 'temporary' });
        page.submit();
        controller.expectOne('/api/v1/auth/login/').flush(response({ is_superuser: true }));
        expect(navigate).toHaveBeenCalledWith('/kpi');
        expect(page.form.controls.password.value).toBe('');
    });

    it('routes mandatory password changes before organization selection', () => {
        const page = TestBed.runInInjectionContext(() => new Login());

        page.form.setValue({ username: 'tester', password: 'temporary' });
        page.submit();
        page.submit();
        controller.expectOne('/api/v1/auth/login/').flush(response({ must_change_password: true }));
        expect(navigate).toHaveBeenCalledWith('/primeiro-acesso/trocar-senha');
    });

    it('routes an ordinary user to organization selection after login', () => {
        const page = TestBed.runInInjectionContext(() => new Login());

        page.form.setValue({ username: 'tester', password: 'temporary' });
        page.submit();
        controller.expectOne('/api/v1/auth/login/').flush(response());
        expect(navigate).toHaveBeenCalledWith('/contexto/selecao');
    });

    it('shows the RFC throttle message and releases the login form', () => {
        const page = TestBed.runInInjectionContext(() => new Login());

        page.form.setValue({ username: 'tester', password: 'temporary' });
        page.submit();
        controller.expectOne('/api/v1/auth/login/').flush({ type: 'urn:datasync:problem:throttled', status: 429, detail: 'Tente novamente em 60 segundos.' }, { status: 429, statusText: 'Too Many Requests' });
        expect(page.errorMessage()).toBe('Tente novamente em 60 segundos.');
        expect(page.loading()).toBeFalse();
        expect(session.isAuthenticated()).toBeFalse();
    });

    it('renders asynchronous login errors without Zone.js and releases the submit button', async () => {
        const fixture = TestBed.createComponent(Login);

        fixture.detectChanges();
        fixture.componentInstance.form.setValue({ username: 'tester', password: 'temporary' });
        fixture.componentInstance.submit();
        controller.expectOne('/api/v1/auth/login/').flush({ type: 'urn:datasync:problem:authentication-required', status: 401, detail: 'Usuário ou senha inválidos.' }, { status: 401, statusText: 'Unauthorized' });
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Usuário ou senha inválidos.');
        expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeFalse();
    });

    it('renders labeled organization options and submits the selected UUID through the form', async () => {
        session.setSession(response());
        const open = spyOn(contexts, 'openContext');
        const fixture = TestBed.createComponent(ContextoSelecaoPage);

        fixture.detectChanges();
        controller.expectOne('/api/v1/me/organizations/').flush(TWO_ORGS);
        await fixture.whenStable();
        expect(open).not.toHaveBeenCalled();
        const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;

        expect(fixture.nativeElement.querySelector('label').htmlFor).toBe(select.id);
        expect(select.options[1].value).toBe(ORG_ID);
        select.value = ORG_ID;
        select.dispatchEvent(new Event('change'));
        fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(open).toHaveBeenCalledWith('/kpi');
        expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_ID);
    });

    it('rejects short or mismatched new passwords before sending a request', () => {
        session.setSession(response({ must_change_password: true }));
        const page = TestBed.runInInjectionContext(() => new PrimeiroAcessoTrocarSenhaPage());

        page.form.setValue({ current_password: 'old', new_password: '12345678', new_password_confirm: '12345678' });
        page.submit();
        expect(page.form.invalid).toBeTrue();
        page.form.setValue({ current_password: 'old', new_password: 'long-password-one', new_password_confirm: 'long-password-two' });
        page.submit();
        expect(page.errorMessage()).toContain('confirmação');
        controller.expectNone('/api/v1/auth/change-password/');
    });

    it('uses the backend user summary after password change and clears password fields', () => {
        session.setSession(response({ must_change_password: true }));
        const page = TestBed.runInInjectionContext(() => new PrimeiroAcessoTrocarSenhaPage());

        page.form.setValue({ current_password: 'old', new_password: 'long-password-one', new_password_confirm: 'long-password-one' });
        page.submit();
        const request = controller.expectOne('/api/v1/auth/change-password/');

        expect(request.request.body.current_password).toBe('old');
        request.flush({ user: response().user });
        expect(session.getUser()?.must_change_password).toBeFalse();
        expect(page.form.controls.new_password.value).toBe('');
        expect(navigate).toHaveBeenCalledWith('/contexto/selecao');
    });

    it('keeps the first-access restriction when backend validation fails', () => {
        session.setSession(response({ must_change_password: true }));
        const page = TestBed.runInInjectionContext(() => new PrimeiroAcessoTrocarSenhaPage());

        page.form.setValue({ current_password: 'wrong', new_password: 'long-password-one', new_password_confirm: 'long-password-one' });
        page.submit();
        controller.expectOne('/api/v1/auth/change-password/').flush({ type: 'urn:datasync:problem:validation-error', status: 422, errors: { current_password: ['Senha atual incorreta.'] } }, { status: 422, statusText: 'Unprocessable Entity' });
        expect(page.errorMessage()).toBe('Senha atual incorreta.');
        expect(session.getUser()?.must_change_password).toBeTrue();
        expect(page.saving()).toBeFalse();
    });

    it('selects a UUID from the accessible organization list and starts a fresh page', () => {
        session.setSession(response());
        const page = TestBed.runInInjectionContext(() => new ContextoSelecaoPage());
        const open = spyOn(contexts, 'openContext');

        page.ngOnInit();
        page.loadOrganizations();
        controller.expectOne('/api/v1/me/organizations/').flush(TWO_ORGS);
        expect(open).not.toHaveBeenCalled();
        page.form.controls.organization.setValue(ORG_ID);
        page.confirm();
        expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_ID);
        expect(open).toHaveBeenCalledWith('/kpi');
        controller.expectNone('/api/v1/me/permissoes-contexto/');
    });

    it('enters the only available organization directly, preserving returnUrl rules', () => {
        session.setSession(response());
        const page = TestBed.runInInjectionContext(() => new ContextoSelecaoPage());
        const open = spyOn(contexts, 'openContext');

        page.ngOnInit();
        controller.expectOne('/api/v1/me/organizations/').flush([{ public_id: ORG_ID, name: 'Organização' }]);
        expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_ID);
        expect(open).toHaveBeenCalledOnceWith('/kpi');
    });

    it('keeps the screen when the only organization is already active (switch from inside the app)', () => {
        session.setSession(response());
        contexts.setActiveContext({ organization_public_id: ORG_ID, organization_name: 'Organização' });
        const page = TestBed.runInInjectionContext(() => new ContextoSelecaoPage());
        const open = spyOn(contexts, 'openContext');

        page.ngOnInit();
        controller.expectOne('/api/v1/me/organizations/').flush([{ public_id: ORG_ID, name: 'Organização' }]);
        expect(open).not.toHaveBeenCalled();
        expect(page.form.controls.organization.value).toBe(ORG_ID);
    });

    it('rejects a manually inserted organization outside the accessible list', () => {
        session.setSession(response());
        const page = TestBed.runInInjectionContext(() => new ContextoSelecaoPage());
        const open = spyOn(contexts, 'openContext');

        page.ngOnInit();
        controller.expectOne('/api/v1/me/organizations/').flush([]);
        page.form.controls.organization.setValue(ORG_ID);
        page.confirm();
        expect(page.errorMessage()).toContain('disponível');
        expect(open).not.toHaveBeenCalled();
    });

    function guard(url: string, audience: AccessAudience = ACCESS_AUDIENCE.AUTHENTICATED, requireContext = true) {
        const route = { pathFromRoot: [{ data: { audience, requireContext } }] } as unknown as ActivatedRouteSnapshot;

        return TestBed.runInInjectionContext(() => accessGuard(route, { url } as RouterStateSnapshot));
    }

    it('redirects unauthenticated users to login', () => {
        expect(router.serializeUrl(guard('/kpi') as ReturnType<Router['createUrlTree']>)).toBe('/landing/login');
    });

    it('blocks business routes until the mandatory password change', () => {
        session.setSession(response({ must_change_password: true }));
        expect(router.serializeUrl(guard('/kpi') as ReturnType<Router['createUrlTree']>)).toContain('/primeiro-acesso/trocar-senha');
        expect(guard('/primeiro-acesso/trocar-senha')).toBeTrue();
    });

    it('requires organization for ordinary users but exempts superadmins', () => {
        session.setSession(response());
        expect(router.serializeUrl(guard('/kpi') as ReturnType<Router['createUrlTree']>)).toContain('/contexto/selecao');
        session.setSession(response({ is_superuser: true }));
        expect(guard('/kpi')).toBeTrue();
    });

    it('denies administrative routes to ordinary users', () => {
        session.setSession(response());
        expect(router.serializeUrl(guard('/pages/administracao/contrato', ACCESS_AUDIENCE.ADMIN, false) as ReturnType<Router['createUrlTree']>)).toBe('/notfound');
    });
});
