import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { CONTEXT_KEY, SESSION_KEY } from '@/app/core/utils/session-data';
import { Login } from './login';

const USER_ID = '019a0000-0000-7000-8000-000000000001';

function result() {
    const token = 'e30.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';

    return { access: token, refresh: token, user: { public_id: USER_ID, username: 'tester', name: 'Teste', is_superuser: false, must_change_password: false } };
}

describe('Login em duas etapas', () => {
    let http: HttpTestingController;
    let session: AuthSessionService;
    let navigate: jasmine.Spy;

    beforeEach(() => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }, MessageService] });
        http = TestBed.inject(HttpTestingController);
        session = TestBed.inject(AuthSessionService);
        navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    });

    afterEach(() => {
        http.verify();
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
    });

    it('guarda a prova só em memória e cria a sessão apenas após confirmar o código', async () => {
        const fixture = TestBed.createComponent(Login);
        const page = fixture.componentInstance;

        fixture.detectChanges();
        page.form.setValue({ username: 'tester', password: 'temporary' });
        page.submit();
        http.expectOne('/api/v1/auth/login/').flush({ mfa_required: true, mfa_token: 'temporary-proof', expires_in: 300 });
        await fixture.whenStable();
        expect(session.isAuthenticated()).toBeFalse();
        expect(localStorage.getItem(SESSION_KEY)).toBeNull();
        expect(page.form.controls.password.value).toBe('');
        expect(fixture.nativeElement.querySelector('#mfa-code')).not.toBeNull();
        expect(navigate).not.toHaveBeenCalled();
        page.mfaForm.controls.code.setValue('123456');
        page.submitMfa();
        const request = http.expectOne('/api/v1/auth/login/mfa/');

        expect(request.request.body).toEqual({ mfa_token: 'temporary-proof', code: '123456' });
        request.flush(result());
        expect(session.isAuthenticated()).toBeTrue();
        expect(page.mfaToken()).toBeNull();
        expect(page.mfaForm.controls.code.value).toBe('');
        expect(navigate).toHaveBeenCalledWith('/contexto/selecao');
    });

    it('permite reserva, mantém a prova após erro e a descarta ao voltar', () => {
        const fixture = TestBed.createComponent(Login);
        const page = fixture.componentInstance;

        fixture.detectChanges();
        page.mfaToken.set('temporary-proof');
        page.toggleRecovery();
        page.mfaForm.controls.code.setValue('ABCD-EF01-2345-6789');
        page.submitMfa();
        http.expectOne('/api/v1/auth/login/mfa/').flush({ type: 'urn:datasync:problem:validation-error', status: 422, errors: { code: ['Código inválido.'] } }, { status: 422, statusText: 'Unprocessable Entity' });
        expect(page.errorMessage()).toContain('Código inválido');
        expect(session.isAuthenticated()).toBeFalse();
        expect(page.mfaToken()).toBe('temporary-proof');
        page.backToPassword();
        expect(page.mfaToken()).toBeNull();
        expect(page.recoveryMode()).toBeFalse();
        expect(page.mfaForm.controls.code.value).toBe('');
    });

    it('descarta resposta de sessão antiga e cancela a verificação ao sair da tela', () => {
        const fixture = TestBed.createComponent(Login);
        const page = fixture.componentInstance;

        fixture.detectChanges();
        page.mfaToken.set('temporary-proof');
        page.mfaForm.controls.code.setValue('123456');
        page.submitMfa();
        const request = http.expectOne('/api/v1/auth/login/mfa/');

        session.clearSession();
        request.flush(result());
        expect(session.isAuthenticated()).toBeFalse();
        page.submitMfa();
        const pending = http.expectOne('/api/v1/auth/login/mfa/');

        fixture.destroy();
        expect(pending.cancelled).toBeTrue();
    });
});
