import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { MfaSettings } from './mfa-settings';

const CODES = Array.from({ length: 10 }, (_, i) => 'ABCD-EF01-2345-' + String(i).padStart(4, '0'));

describe('Configuração de duas etapas', () => {
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }] });
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => {
        http.verify();
        TestBed.resetTestingModule();
    });

    it('não ativa só por gerar o segredo e só conclui após guardar os códigos reserva', async () => {
        const fixture = TestBed.createComponent(MfaSettings);
        const component = fixture.componentInstance;
        const changed = jasmine.createSpy('changed');

        component.changed.subscribe(changed);
        fixture.detectChanges();
        http.expectOne('/api/v1/me/mfa/').flush({ enabled: false, setup_pending: false, recovery_codes_remaining: 0 });
        component.start();
        http.expectOne('/api/v1/me/mfa/setup/').flush({ secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/Datasync:teste?secret=JBSWY3DPEHPK3PXP&issuer=Datasync' });
        await fixture.whenStable();
        expect(component.status()?.enabled).toBeFalse();
        expect(fixture.nativeElement.textContent).toContain('JBSWY3DPEHPK3PXP');
        expect(changed).not.toHaveBeenCalled();
        component.codeForm.controls.code.setValue('123456');
        component.enable();
        const confirm = http.expectOne('/api/v1/me/mfa/enable/');

        expect(confirm.request.body).toEqual({ code: '123456' });
        confirm.flush({ recovery_codes: CODES });
        fixture.detectChanges();
        expect(component.setup()).toBeNull();
        expect(component.qr()).toBe('');
        expect(component.recoveryCodes()).toEqual(CODES);
        component.finish();
        expect(changed).not.toHaveBeenCalled();
        component.savedCodes.set(true);
        component.finish();
        expect(changed).toHaveBeenCalledTimes(1);
        expect(component.recoveryCodes()).toEqual([]);
    });

    it('pede senha e código para desativar e preserva o estado quando o servidor rejeita', () => {
        const fixture = TestBed.createComponent(MfaSettings);
        const component = fixture.componentInstance;

        fixture.detectChanges();
        http.expectOne('/api/v1/me/mfa/').flush({ enabled: true, setup_pending: false, recovery_codes_remaining: 9 });
        component.chooseAction('disable');
        component.submitAction();
        http.expectNone('/api/v1/me/mfa/disable/');
        component.disableForm.setValue({ password: 'senha atual', code: '123456' });
        component.submitAction();
        const request = http.expectOne('/api/v1/me/mfa/disable/');

        expect(request.request.body).toEqual({ password: 'senha atual', code: '123456' });
        request.flush({ type: 'urn:datasync:problem:validation-error', status: 422, errors: { code: ['Código inválido.'] } }, { status: 422, statusText: 'Unprocessable Entity' });
        expect(component.status()?.enabled).toBeTrue();
        expect(component.error()).toContain('Código inválido');
        component.chooseAction(null);
        expect(component.disableForm.controls.password.value).toBe('');
        expect(component.disableForm.controls.code.value).toBe('');
    });

    it('cancela o carregamento e limpa credenciais transitórias ao sair', () => {
        const fixture = TestBed.createComponent(MfaSettings);
        const component = fixture.componentInstance;

        fixture.detectChanges();
        const request = http.expectOne('/api/v1/me/mfa/');

        component.recoveryCodes.set(CODES);
        component.disableForm.setValue({ password: 'senha atual', code: '123456' });
        fixture.destroy();
        expect(request.cancelled).toBeTrue();
        expect(component.recoveryCodes()).toEqual([]);
        expect(component.disableForm.controls.password.value).toBe('');
    });
});
