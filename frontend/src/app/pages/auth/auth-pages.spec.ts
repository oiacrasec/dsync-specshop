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
import { APP_BRAND } from '@/app/core/tokens/app-brand';
import { environment } from '@/environments/environment';
import { PrimeiroAcessoTrocarSenhaPage } from './primeiro-acesso-trocar-senha';
import { ContextoSelecaoPage } from './contexto-selecao';
import { AppTopbar } from '@/app/layout/components/app.topbar';
import { UiOrganizationPicker } from '@/app/shared/ui/organization-picker/organization-picker';

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
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '/dashboards' } } } },
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
        expect(navigate).toHaveBeenCalledWith('/dashboards');
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

    it('shows the configurable system name in the login title', () => {
        const fixture = TestBed.createComponent(Login);

        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('h1').textContent).toBe(`Entrar no ${TestBed.inject(APP_BRAND).name}`);
        expect(TestBed.inject(APP_BRAND).name).toBe(environment.appName);
    });

    it('renders labeled radio cards and confirms the selected UUID', async () => {
        session.setSession(response());
        const open = spyOn(contexts, 'openContext');
        const fixture = TestBed.createComponent(ContextoSelecaoPage);

        fixture.detectChanges();
        controller.expectOne('/api/v1/me/organizations/').flush(TWO_ORGS);
        await fixture.whenStable();
        expect(open).not.toHaveBeenCalled();
        const radio = fixture.nativeElement.querySelector('input[type="radio"]') as HTMLInputElement;

        expect(radio.labels?.[0].textContent).toContain('Organização');
        expect(radio.value).toBe(ORG_ID);
        radio.click();
        fixture.detectChanges();
        const confirm = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) => (button as HTMLButtonElement).textContent?.trim() === 'Entrar') as HTMLButtonElement;

        confirm.click();
        expect(open).toHaveBeenCalledWith('/dashboards');
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
        const page = createPicker();
        const open = spyOn(contexts, 'openContext');

        page.ngOnInit();
        page.loadOrganizations();
        controller.expectOne('/api/v1/me/organizations/').flush(TWO_ORGS);
        expect(open).not.toHaveBeenCalled();
        page.selectedId.set(ORG_ID);
        page.confirm();
        expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_ID);
        expect(open).toHaveBeenCalledWith('/dashboards');
        controller.expectNone('/api/v1/me/permissoes-contexto/');
    });

    it('enters the only available organization directly, preserving returnUrl rules', () => {
        session.setSession(response());
        const page = createPicker();
        const open = spyOn(contexts, 'openContext');

        page.ngOnInit();
        controller.expectOne('/api/v1/me/organizations/').flush([{ public_id: ORG_ID, name: 'Organização' }]);
        expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_ID);
        expect(open).toHaveBeenCalledOnceWith('/dashboards');
    });

    it('keeps the screen when the only organization is already active (switch from inside the app)', () => {
        session.setSession(response());
        contexts.setActiveContext({ organization_public_id: ORG_ID, organization_name: 'Organização' });
        const page = createPicker();
        const open = spyOn(contexts, 'openContext');

        page.ngOnInit();
        controller.expectOne('/api/v1/me/organizations/').flush([{ public_id: ORG_ID, name: 'Organização' }]);
        expect(open).not.toHaveBeenCalled();
        expect(page.selectedId()).toBe(ORG_ID);
    });

    it('rejects a manually inserted organization outside the accessible list', () => {
        session.setSession(response());
        const page = createPicker();
        const open = spyOn(contexts, 'openContext');

        page.ngOnInit();
        controller.expectOne('/api/v1/me/organizations/').flush([]);
        page.selectedId.set(ORG_ID);
        page.confirm();
        expect(page.errorMessage()).toContain('disponível');
        expect(open).not.toHaveBeenCalled();
    });

    it('filters 100 organizations locally, keeps the selection and only scrolls the list', async () => {
        session.setSession(response());
        const open = spyOn(contexts, 'openContext');
        const fixture = TestBed.createComponent(UiOrganizationPicker);
        const picker = fixture.componentInstance;
        const organizations = Array.from({ length: 100 }, (_, index) => ({ public_id: '019a0000-0000-7000-8000-' + (index + 10).toString(16).padStart(12, '0'), name: 'Organização ' + String(index + 1).padStart(3, '0') }));

        fixture.componentRef.setInput('switching', true);
        fixture.componentRef.setInput('returnUrl', '/perfil');
        fixture.detectChanges();
        controller.expectOne('/api/v1/me/organizations/').flush(organizations);
        await fixture.whenStable();
        const element = fixture.nativeElement as HTMLElement;
        const radios = element.querySelectorAll<HTMLInputElement>('input[type="radio"]');

        expect(radios.length).toBe(100);
        radios[1].click();
        fixture.detectChanges();
        expect(contexts.hasActiveContext()).toBeFalse();
        const list = element.querySelector('.organization-list') as HTMLElement;
        const footer = element.querySelector('footer') as HTMLElement;
        const footerTop = footer.getBoundingClientRect().top;

        expect(list.clientHeight).toBeLessThanOrEqual(350);
        expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
        list.scrollTop = 200;
        expect(list.scrollTop).toBeGreaterThan(0);
        expect(footer.getBoundingClientRect().top).toBe(footerTop);
        const search = element.querySelector<HTMLInputElement>('#organization-search')!;

        search.value = ' ORGANIZACAO 09 ';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(picker.filtered().length).toBe(10);
        expect(element.querySelectorAll('input[type="radio"]').length).toBe(10);
        expect(picker.selected()?.name).toBe('Organização 002');
        search.value = 'inexistente';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(element.textContent).toContain('Nenhuma organização encontrada');
        expect(picker.selected()?.public_id).toBe(organizations[1].public_id);
        picker.confirm();
        expect(contexts.getActiveContext()?.organization_public_id).toBe(organizations[1].public_id);
        expect(open).toHaveBeenCalledOnceWith('/perfil');
        controller.expectNone('/api/v1/me/organizations/');
    });

    it('shows search only above seven organizations and escapes names', async () => {
        session.setSession(response());
        const fixture = TestBed.createComponent(UiOrganizationPicker);

        fixture.detectChanges();
        controller.expectOne('/api/v1/me/organizations/').flush(TWO_ORGS);
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelector('#organization-search')).toBeNull();
        fixture.componentInstance.organizations.set(Array.from({ length: 7 }, (_, i) => ({ public_id: String(i), name: '<img src=x onerror=alert(1)>' })));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#organization-search')).toBeNull();
        expect(fixture.nativeElement.querySelector('img')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('<img src=x onerror=alert(1)>');
        fixture.componentInstance.organizations.update((items) => [...items, { public_id: '8', name: 'Oitava' }]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#organization-search')).not.toBeNull();
    });

    it('retries an organization load error and never applies a stale response', async () => {
        session.setSession(response());
        const fixture = TestBed.createComponent(UiOrganizationPicker);

        fixture.detectChanges();
        controller.expectOne('/api/v1/me/organizations/').flush({}, { status: 503, statusText: 'Unavailable' });
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Não foi possível carregar');
        fixture.componentInstance.loadOrganizations();
        const pending = controller.expectOne('/api/v1/me/organizations/');

        session.clearSession();
        pending.flush(TWO_ORGS);
        expect(fixture.componentInstance.organizations()).toEqual([]);
        expect(contexts.hasActiveContext()).toBeFalse();
    });

    it('cancels an outstanding organization request when the picker is destroyed', () => {
        session.setSession(response());
        const fixture = TestBed.createComponent(UiOrganizationPicker);

        fixture.detectChanges();
        const request = controller.expectOne('/api/v1/me/organizations/');

        fixture.destroy();
        expect(request.cancelled).toBeTrue();
    });

    it('opens organization switching in a dialog without navigation and cancels without changing context', async () => {
        session.setSession(response());
        contexts.setActiveContext({ organization_public_id: ORG_ID, organization_name: 'Organização' });
        const fixture = TestBed.createComponent(AppTopbar);
        const topbar = fixture.componentInstance;
        const routeNavigation = spyOn(router, 'navigate');
        const open = spyOn(contexts, 'openContext');

        fixture.detectChanges();
        topbar.switchContext(new Event('click'));
        fixture.detectChanges();
        controller.expectOne('/api/v1/me/organizations/').flush(TWO_ORGS);
        await fixture.whenStable();
        const dialog = document.querySelector('[role="dialog"]')!;

        expect(dialog).not.toBeNull();
        expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toContain('Trocar organização');
        expect(routeNavigation).not.toHaveBeenCalled();
        const pickerElement = document.querySelector('ui-organization-picker')!;
        const radios = pickerElement.querySelectorAll<HTMLInputElement>('input[type="radio"]');

        radios[1].click();
        const cancel = Array.from(pickerElement.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Cancelar')!;

        cancel.click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(topbar.contextDialogVisible()).toBeFalse();
        expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_ID);
        expect(open).not.toHaveBeenCalled();
        topbar.restoreProfileFocus();
        expect(document.activeElement?.getAttribute('aria-label')).toBe('Abrir menu do perfil');
    });

    it('closes the dialog with Escape without changing the active organization', async () => {
        session.setSession(response());
        contexts.setActiveContext({ organization_public_id: ORG_ID, organization_name: 'Organização' });
        const fixture = TestBed.createComponent(AppTopbar);

        fixture.detectChanges();
        fixture.componentInstance.switchContext(new Event('click'));
        fixture.detectChanges();
        controller.expectOne('/api/v1/me/organizations/').flush(TWO_ORGS);
        await fixture.whenStable();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(fixture.componentInstance.contextDialogVisible()).toBeFalse();
        expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_ID);
    });

    it('keeps the profile icons at the right edge while the organization dialog is closed', () => {
        session.setSession(response());
        const fixture = TestBed.createComponent(AppTopbar);

        fixture.detectChanges();
        const bar = fixture.nativeElement.querySelector('.layout-topbar') as HTMLElement;
        const icons = bar.querySelector('.topbar-right') as HTMLElement;
        const padding = parseFloat(getComputedStyle(bar).paddingRight);

        expect(icons.getBoundingClientRect().right).toBeCloseTo(bar.getBoundingClientRect().right - padding, 0);
        expect(fixture.componentInstance.contextDialogVisible()).toBeFalse();
        expect(getComputedStyle(bar.querySelector('[aria-label="Abrir menu do perfil"]')!).cursor).toBe('pointer');
    });

    it('never offers a switch dialog for superadmins', () => {
        session.setSession(response({ is_superuser: true }));
        const fixture = TestBed.createComponent(AppTopbar);

        fixture.detectChanges();
        fixture.componentInstance.switchContext(new Event('click'));
        expect(fixture.componentInstance.contextDialogVisible()).toBeFalse();
        controller.expectNone('/api/v1/me/organizations/');
    });

    function createPicker() {
        const fixture = TestBed.createComponent(UiOrganizationPicker);

        fixture.componentRef.setInput('returnUrl', '/dashboards');

        return fixture.componentInstance;
    }

    function guard(url: string, audience: AccessAudience = ACCESS_AUDIENCE.AUTHENTICATED, requireContext = true) {
        const route = { pathFromRoot: [{ data: { audience, requireContext } }] } as unknown as ActivatedRouteSnapshot;

        return TestBed.runInInjectionContext(() => accessGuard(route, { url } as RouterStateSnapshot));
    }

    it('redirects unauthenticated users to login', () => {
        expect(router.serializeUrl(guard('/dashboards') as ReturnType<Router['createUrlTree']>)).toBe('/landing/login');
    });

    it('blocks business routes until the mandatory password change', () => {
        session.setSession(response({ must_change_password: true }));
        expect(router.serializeUrl(guard('/dashboards') as ReturnType<Router['createUrlTree']>)).toContain('/primeiro-acesso/trocar-senha');
        expect(guard('/primeiro-acesso/trocar-senha')).toBeTrue();
    });

    it('requires organization for ordinary users but exempts superadmins', () => {
        session.setSession(response());
        expect(router.serializeUrl(guard('/dashboards') as ReturnType<Router['createUrlTree']>)).toContain('/contexto/selecao');
        session.setSession(response({ is_superuser: true }));
        expect(guard('/dashboards')).toBeTrue();
    });

    it('denies administrative routes to ordinary users', () => {
        session.setSession(response());
        expect(router.serializeUrl(guard('/pages/administracao/contrato', ACCESS_AUDIENCE.ADMIN, false) as ReturnType<Router['createUrlTree']>)).toBe('/notfound');
    });
});
