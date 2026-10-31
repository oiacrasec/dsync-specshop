import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentInjector, createEnvironmentInjector, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from './services/auth-session.service';
import { UserContextService } from './services/user-context.service';
import { TableQueryCacheService } from './services/table-query-cache.service';
import { authInterceptor } from './interceptors/auth.interceptor';
import { contextErrorInterceptor } from './interceptors/context-error.interceptor';
import { API_BASE_URL } from './tokens/api-base-url';
import { CONTEXT_KEY, SESSION_KEY } from './utils/session-data';
import { apiPath } from './utils/api-url';
import { problemMessage } from './utils/api-problem';
import { LoginResponse } from '@/app/types/auth';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const ORG_A = '019a0000-0000-7000-8000-000000000002';
const ORG_B = '019a0000-0000-7000-8000-000000000003';

function jwt(seconds: number, nonce = 'initial') {
    return `${btoa('{}')}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds, nonce }))}.signature`;
}

function login(overrides: Partial<LoginResponse['user']> = {}, seconds = 300): LoginResponse {
    return { access: jwt(seconds), refresh: jwt(3600), user: { public_id: USER_ID, username: 'tester', name: 'Teste', is_superuser: false, must_change_password: false, ...overrides } };
}

function problem(status: number, code: string) {
    return { type: `urn:dsync:problem:${code}`, status, title: 'Erro', detail: 'Mensagem segura.' };
}

describe('Core authentication and shared organization', () => {
    let http: HttpClient;
    let controller: HttpTestingController;
    let session: AuthSessionService;
    let contexts: UserContextService;
    let navigate: jasmine.Spy;
    let reload: jasmine.Spy;

    beforeEach(() => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
        TestBed.configureTestingModule({
            providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(withInterceptors([contextErrorInterceptor, authInterceptor])), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }, MessageService]
        });
        http = TestBed.inject(HttpClient);
        controller = TestBed.inject(HttpTestingController);
        contexts = TestBed.inject(UserContextService);
        reload = spyOn(contexts, 'reloadPage');
        navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        session = TestBed.inject(AuthSessionService);
        session.setSession(login());
        contexts.setActiveContext({ organization_public_id: ORG_A, organization_name: 'A' });
    });

    afterEach(() => {
        controller.verify();
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
    });

    async function pendingRequest(url: string): Promise<TestRequest> {
        for (let attempt = 0; attempt < 50; attempt++) {
            const requests = controller.match(url);

            if (requests.length) {
                expect(requests.length).toBe(1);

                return requests[0];
            }

            await new Promise((resolve) => setTimeout(resolve, 0));
        }

        throw new Error(`Requisição não encontrada: ${url}`);
    }

    it('persists JWTs and organization in localStorage with the owning user', () => {
        expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).access).toBe(session.getAccessToken());
        expect(JSON.parse(localStorage.getItem(CONTEXT_KEY)!)).toEqual({ organization_public_id: ORG_A, organization_name: 'A', user_public_id: USER_ID });
    });

    it('sends Bearer and UUID context only to business endpoints of the exact API', () => {
        http.get('/api/v1/items/').subscribe();
        const request = controller.expectOne('/api/v1/items/');

        expect(request.request.headers.get('Authorization')).toBe(`Bearer ${session.getAccessToken()}`);
        expect(request.request.headers.get('X-Organization-Id')).toBe(ORG_A);
        expect(request.request.headers.has('X-Contrato-Id')).toBeFalse();
        request.flush({});
    });

    it('never leaks session or context to another host or a similar API prefix', () => {
        for (const url of ['https://external.example/api/v1/items/', '/api/v10/items/']) {
            http.get(url).subscribe();
            const request = controller.expectOne(url);

            expect(request.request.headers.has('Authorization')).toBeFalse();
            expect(request.request.headers.has('X-Organization-Id')).toBeFalse();
            request.flush({});
        }
    });

    it('does not send organization to admin, organization selection or password change', () => {
        for (const path of ['/admin/contracts/', '/me/organizations/', '/auth/change-password/', '/me/mfa/', '/me/mfa/setup/']) {
            http.get(`/api/v1${path}`).subscribe();
            const request = controller.expectOne(`/api/v1${path}`);

            expect(request.request.headers.has('Authorization')).toBeTrue();
            expect(request.request.headers.has('X-Organization-Id')).toBeFalse();
            request.flush({});
        }
    });

    it('does not add Bearer or context to login, refresh and logout', () => {
        for (const path of ['login', 'login/mfa', 'refresh', 'logout']) {
            http.post(`/api/v1/auth/${path}/`, {}).subscribe();
            const request = controller.expectOne(`/api/v1/auth/${path}/`);

            expect(request.request.headers.has('Authorization')).toBeFalse();
            expect(request.request.headers.has('X-Organization-Id')).toBeFalse();
            request.flush({});
        }
    });

    it('keeps everyday requests free of refresh calls and storage parsing', () => {
        const getItem = spyOn(Storage.prototype, 'getItem').and.callThrough();
        const setItem = spyOn(Storage.prototype, 'setItem').and.callThrough();

        for (let index = 0; index < 30; index++) {
            http.get('/api/v1/items/').subscribe();
            controller.expectOne('/api/v1/items/').flush({});
        }

        controller.expectNone('/api/v1/auth/refresh/');
        expect(getItem).not.toHaveBeenCalled();
        expect(setItem).not.toHaveBeenCalled();
    });

    it('shares one refresh among concurrent calls in the same tab', async () => {
        const a = firstValueFrom(session.refreshAccessToken());
        const b = firstValueFrom(session.refreshAccessToken());
        const request = await pendingRequest('/api/v1/auth/refresh/');
        const tokens = { access: jwt(300, 'rotated'), refresh: jwt(3600, 'rotated') };

        request.flush(tokens);
        expect(await a).toEqual(tokens);
        expect(await b).toEqual(tokens);
    });

    it('coordinates refresh between independent sessions representing two tabs', async () => {
        const injector = createEnvironmentInjector([AuthSessionService], TestBed.inject(EnvironmentInjector));
        const secondTab = injector.get(AuthSessionService);
        const a = firstValueFrom(session.refreshAccessToken());
        const b = firstValueFrom(secondTab.refreshAccessToken());
        const request = await pendingRequest('/api/v1/auth/refresh/');
        const tokens = { access: jwt(300, 'two-tabs'), refresh: jwt(3600, 'two-tabs') };

        request.flush(tokens);
        expect(await a).toEqual(tokens);
        expect(await b).toEqual(tokens);
        controller.expectNone('/api/v1/auth/refresh/');
        injector.destroy();
    });

    it('renews before sending an expired access token', async () => {
        session.setSession(login({}, -1));
        const response = firstValueFrom(http.get('/api/v1/items/'));
        const refresh = await pendingRequest('/api/v1/auth/refresh/');
        const access = jwt(300, 'fresh');

        refresh.flush({ access, refresh: jwt(3600, 'fresh') });
        const request = await pendingRequest('/api/v1/items/');

        expect(request.request.headers.get('Authorization')).toBe(`Bearer ${access}`);
        request.flush({ ok: true });
        expect(await response).toEqual({ ok: true });
    });

    it('retries an authentication 401 once and ends the session after another 401', async () => {
        const result = firstValueFrom(http.get('/api/v1/items/')).catch((error) => error);

        controller.expectOne('/api/v1/items/').flush(problem(401, 'authentication-required'), { status: 401, statusText: 'Unauthorized' });
        const refresh = await pendingRequest('/api/v1/auth/refresh/');

        refresh.flush({ access: jwt(300, 'retry'), refresh: jwt(3600, 'retry') });
        (await pendingRequest('/api/v1/items/')).flush(problem(401, 'authentication-required'), { status: 401, statusText: 'Unauthorized' });
        expect((await result).status).toBe(401);
        expect(session.getUser()).toBeNull();
        expect(navigate).toHaveBeenCalledWith('/landing/login');
        controller.expectNone('/api/v1/auth/refresh/');
    });

    it('clears all local credentials when refresh is rejected', async () => {
        const result = firstValueFrom(session.refreshAccessToken()).catch((error) => error);

        (await pendingRequest('/api/v1/auth/refresh/')).flush(problem(401, 'authentication-required'), { status: 401, statusText: 'Unauthorized' });
        expect((await result).status).toBe(401);
        expect(localStorage.getItem(SESSION_KEY)).toBeNull();
        expect(localStorage.getItem(CONTEXT_KEY)).toBeNull();
    });

    it('does not restore an old session when refresh finishes after a new login', async () => {
        const result = firstValueFrom(session.refreshAccessToken()).catch((error) => error);
        const request = await pendingRequest('/api/v1/auth/refresh/');
        const newer = login({ public_id: ORG_B, username: 'other' });

        session.setSession(newer);
        request.flush({ access: jwt(300, 'old-session'), refresh: jwt(3600, 'old-session') });
        expect(await result).toEqual(jasmine.any(Error));
        expect(session.getUser()?.username).toBe('other');
        expect(session.getAccessToken()).toBe(newer.access);
    });

    it('logs out after rotation and revokes the newest refresh', async () => {
        const rotating = firstValueFrom(session.refreshAccessToken());
        const refresh = await pendingRequest('/api/v1/auth/refresh/');
        const leaving = firstValueFrom(session.logout());
        const tokens = { access: jwt(300, 'logout'), refresh: jwt(3600, 'logout') };

        refresh.flush(tokens);
        await rotating;
        const request = await pendingRequest('/api/v1/auth/logout/');

        expect(request.request.body).toEqual({ refresh: tokens.refresh });
        expect(session.getUser()).toBeNull();
        request.flush(null, { status: 204, statusText: 'No Content' });
        await leaving;
    });

    it('keeps local logout effective even when server revocation fails', async () => {
        const result = firstValueFrom(session.logout()).catch((error) => error);

        (await pendingRequest('/api/v1/auth/logout/')).flush({}, { status: 503, statusText: 'Unavailable' });
        expect((await result).status).toBe(503);
        expect(session.getUser()).toBeNull();
        expect(contexts.hasActiveContext()).toBeFalse();
    });

    it('reloads other tabs when organization changes and clears their caches', () => {
        const cache = TestBed.inject(TableQueryCacheService);

        cache.set('old-org', { secret: 'old' }, 10000);
        localStorage.setItem(CONTEXT_KEY, JSON.stringify({ user_public_id: USER_ID, organization_public_id: ORG_B, organization_name: 'B' }));
        window.dispatchEvent(new StorageEvent('storage', { key: CONTEXT_KEY, storageArea: localStorage }));
        expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_B);
        expect(cache.get('old-org')).toBeNull();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not reload when only an organization label changes', () => {
        localStorage.setItem(CONTEXT_KEY, JSON.stringify({ user_public_id: USER_ID, organization_public_id: ORG_A, organization_name: 'Updated' }));
        window.dispatchEvent(new StorageEvent('storage', { key: CONTEXT_KEY, storageArea: localStorage }));
        expect(contexts.getActiveContext()?.organization_name).toBe('Updated');
        expect(reload).not.toHaveBeenCalled();
    });

    it('receives a real browser storage event from another browsing context', async () => {
        const frame = document.createElement('iframe');

        document.body.appendChild(frame);

        try {
            await new Promise<void>((resolve) => {
                const received = (event: StorageEvent) => {
                    if (event.key === CONTEXT_KEY) {
                        window.removeEventListener('storage', received);
                        resolve();
                    }
                };

                window.addEventListener('storage', received);
                frame.contentWindow!.localStorage.setItem(CONTEXT_KEY, JSON.stringify({ user_public_id: USER_ID, organization_public_id: ORG_B, organization_name: 'B' }));
            });
            expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_B);
            expect(reload).toHaveBeenCalledTimes(1);
        } finally {
            frame.remove();
        }
    });

    it('synchronizes logout from another tab and reloads', () => {
        localStorage.removeItem(SESSION_KEY);
        window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY, storageArea: localStorage }));
        expect(session.getUser()).toBeNull();
        expect(contexts.hasActiveContext()).toBeFalse();
        expect(reload).toHaveBeenCalled();
    });

    it('discards organization context owned by another user', () => {
        contexts.bindUser(ORG_B);
        expect(contexts.hasActiveContext()).toBeFalse();
        expect(localStorage.getItem(CONTEXT_KEY)).toBeNull();
    });

    it('does not let an old 403 alter a newer organization', async () => {
        const result = firstValueFrom(http.get('/api/v1/items/')).catch((error) => error);
        const request = controller.expectOne('/api/v1/items/');

        contexts.setActiveContext({ organization_public_id: ORG_B, organization_name: 'B' });
        request.flush(problem(403, 'context-forbidden'), { status: 403, statusText: 'Forbidden' });
        await result;
        expect(contexts.getActiveContext()?.organization_public_id).toBe(ORG_B);
    });

    it('discards a successful response from the previous organization', async () => {
        const result = firstValueFrom(http.get('/api/v1/items/')).catch((error) => error);
        const request = controller.expectOne('/api/v1/items/');

        contexts.setActiveContext({ organization_public_id: ORG_B, organization_name: 'B' });
        request.flush({ oldOrganizationData: true });
        expect(await result).toEqual(jasmine.any(Error));
    });

    it('redirects forced password changes and clears organization', async () => {
        const result = firstValueFrom(http.get('/api/v1/items/')).catch((error) => error);

        controller.expectOne('/api/v1/items/').flush(problem(403, 'password-change-required'), { status: 403, statusText: 'Forbidden' });
        await result;
        expect(session.getUser()?.must_change_password).toBeTrue();
        expect(contexts.hasActiveContext()).toBeFalse();
        expect(navigate).toHaveBeenCalledWith('/primeiro-acesso/trocar-senha');
    });

    it('does not clear the session for ordinary permission-denied errors', async () => {
        const result = firstValueFrom(http.get('/api/v1/items/')).catch((error) => error);

        controller.expectOne('/api/v1/items/').flush(problem(403, 'permission-denied'), { status: 403, statusText: 'Forbidden' });
        await result;
        expect(session.isAuthenticated()).toBeTrue();
        expect(contexts.hasActiveContext()).toBeTrue();
    });

    it('calls the core organization API once with the lightweight array contract', () => {
        contexts.loadAvailableContexts().subscribe((organizations) => expect(organizations).toEqual([{ public_id: ORG_A, name: 'A' }]));
        const request = controller.expectOne('/api/v1/me/organizations/');

        expect(request.request.params.keys()).toEqual([]);
        request.flush([{ public_id: ORG_A, name: 'A' }]);
    });

    it('fails closed on malformed persisted authentication', () => {
        localStorage.setItem(SESSION_KEY, '{broken');
        window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY, storageArea: localStorage }));
        expect(session.isAuthenticated()).toBeFalse();
        expect(contexts.hasActiveContext()).toBeFalse();
    });

    it('does not send organization headers for superadmins', () => {
        session.setSession(login({ is_superuser: true }));
        contexts.setActiveContext({ organization_public_id: ORG_A, organization_name: 'A' });
        http.get('/api/v1/items/').subscribe();
        const request = controller.expectOne('/api/v1/items/');

        expect(request.request.headers.has('X-Organization-Id')).toBeFalse();
        request.flush({});
    });
});

describe('API boundary and RFC 9457 presentation', () => {
    it('rejects an empty base URL and a lookalike host', () => {
        expect(apiPath('/api/v1/items/', '')).toBeNull();
        expect(apiPath('https://api.example.evil/api/v1/items/', 'https://api.example/api/v1')).toBeNull();
        expect(apiPath('/api/v10/items/', '/api/v1')).toBeNull();
        expect(apiPath('/api/v1/items/?q=1', '/api/v1')).toBe('/items/');
    });

    it('presents validation messages from the RFC errors field', () => {
        const error = new HttpErrorResponse({ status: 422, error: { ...problem(422, 'validation-error'), errors: { new_password: ['Use 12 caracteres.'] } } });

        expect(problemMessage(error, 'Falha')).toBe('Use 12 caracteres.');
    });

    it('does not expose an arbitrary backend payload as an error message', () => {
        expect(problemMessage(new HttpErrorResponse({ status: 500, error: '<html>traceback</html>' }), 'Falha segura')).toBe('Falha segura');
    });
});
