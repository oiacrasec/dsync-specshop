import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { needsOrganizationHeader } from '@/app/core/utils/api-url';
import { DocumentacaoApiPage } from './api';

const ORG_ID = '019a0000-0000-7000-8000-000000000002';

interface SwaggerRequest {
    url: string;
    headers: Record<string, string>;
}

function page(superuser = false) {
    TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.local/api/v1' }]
    });
    const session = TestBed.inject(AuthSessionService);

    spyOn(session, 'ensureAccessToken').and.returnValue(of('token-1'));
    spyOn(session, 'getUser').and.returnValue({ public_id: 'u', username: 'u', name: 'U', is_superuser: superuser, must_change_password: false });
    spyOn(TestBed.inject(UserContextService), 'getActiveContext').and.returnValue({ organization_public_id: ORG_ID, organization_name: 'Matriz' });
    const instance = TestBed.runInInjectionContext(() => new DocumentacaoApiPage());

    return (request: SwaggerRequest) => (instance as unknown as { withCredentials(request: SwaggerRequest): Promise<SwaggerRequest> }).withCredentials(request);
}

describe('Documentação da API', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('o Try it out leva token e organização só para a API', async () => {
        const send = page();

        expect((await send({ url: 'http://api.local/api/v1/users/', headers: {} })).headers).toEqual({ Authorization: 'Bearer token-1', 'X-Organization-Id': ORG_ID });
        expect((await send({ url: 'http://api.local/api/v1/me/organizations/', headers: {} })).headers).toEqual({ Authorization: 'Bearer token-1' });
        expect((await send({ url: 'http://outro.host/api/v1/users/', headers: { Authorization: 'Bearer colado' } })).headers).toEqual({});
        expect((await send({ url: 'http://api.local/api/v1/auth/login/', headers: {} })).headers).toEqual({});
    });

    it('superadmin não envia organização', async () => {
        const send = page(true);

        expect((await send({ url: 'http://api.local/api/v1/admin/contracts/', headers: {} })).headers).toEqual({ Authorization: 'Bearer token-1' });
        expect(needsOrganizationHeader('/users/', true)).toBeFalse();
        expect(needsOrganizationHeader('/users/', false)).toBeTrue();
    });
});
