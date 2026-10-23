import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { ZonedDatePipe } from '@/app/shared/pipes/zoned-date.pipe';
import { PerfilPage } from './perfil';

const URL = '/api/v1/me/profile/';
const PROFILE = { username: 'maria', name: 'Maria', time_zone: 'America/Sao_Paulo', avatar_url: '/api/v1/media/abc:1:sig/' };

function configure() {
    TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }, MessageService]
    });
    const fixture = TestBed.createComponent(PerfilPage);

    fixture.detectChanges();
    const controller = TestBed.inject(HttpTestingController);

    controller.expectOne(URL).flush(PROFILE);

    return { page: fixture.componentInstance, controller, messages: TestBed.inject(MessageService) };
}

describe('Perfil', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('carrega os dados e envia o formulário inteiro num PUT multipart, sem senha', () => {
        const { page, controller } = configure();

        expect(page.username()).toBe('maria');
        expect(page.form.getRawValue()).toEqual({ name: 'Maria', time_zone: 'America/Sao_Paulo' });
        expect(page.avatarSrc()).toBe('/api/v1/media/abc:1:sig/');
        const file = new File(['img'], 'eu.png', { type: 'image/png' });

        page.chooseAvatar({ target: { files: [file], value: 'eu.png' } } as unknown as Event);
        page.form.patchValue({ name: ' Maria Silva ', time_zone: 'Europe/Lisbon' });
        page.save();
        const request = controller.expectOne(URL);
        const body = request.request.body as FormData;

        expect(request.request.method).toBe('PUT');
        expect(body.get('name')).toBe('Maria Silva');
        expect(body.get('time_zone')).toBe('Europe/Lisbon');
        expect(body.get('avatar')).toBe(file);
        expect(body.has('remove_avatar')).toBeFalse();
        request.flush({ ...PROFILE, name: 'Maria Silva' });
        controller.verify();
    });

    it('remove a foto e, com a aba Senha preenchida, troca a senha depois do perfil', () => {
        const { page, controller } = configure();

        page.clearAvatar();
        expect(page.avatarSrc()).toBeNull();
        page.passwordForm.setValue({ current_password: 'atual-123', new_password: 'Nova-Senha-123', new_password_confirm: 'Nova-Senha-123' });
        page.save();
        const profile = controller.expectOne(URL);

        expect((profile.request.body as FormData).get('remove_avatar')).toBe('true');
        profile.flush({ ...PROFILE, avatar_url: '' });
        const password = controller.expectOne('/api/v1/auth/change-password/');

        expect(password.request.body).toEqual({ current_password: 'atual-123', new_password: 'Nova-Senha-123', new_password_confirm: 'Nova-Senha-123' });
        password.flush({ user: {} });
        expect(page.passwordForm.getRawValue().current_password).toBe('');
    });

    it('bloqueia senha que não confere e foto fora do padrão, sem chamar a API', () => {
        const { page, controller, messages } = configure();
        const add = spyOn(messages, 'add');

        page.chooseAvatar({ target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })], value: '' } } as unknown as Event);
        expect(page.selectedFile()).toBeNull();
        page.passwordForm.setValue({ current_password: 'a', new_password: 'b', new_password_confirm: 'c' });
        page.save();
        expect(add).toHaveBeenCalledTimes(2);
        controller.verify();
    });
});

describe('Perfil — aba Sessões', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('busca sessões e acessos só ao abrir a aba, uma vez', () => {
        const { page, controller } = configure();

        page.onTabChange('senha');
        controller.verify();
        page.onTabChange('sessoes');
        controller.expectOne('/api/v1/me/sessions/').flush([{ public_id: 's1', device: 'Safari no iOS', ip: '10.0.0.1', created_at: '2026-10-23T10:00:00Z', last_seen_at: '2026-10-23T11:00:00Z', current: true }]);
        controller.expectOne('/api/v1/me/logins/').flush([{ occurred_at: '2026-10-23T10:00:00Z', ip: '10.0.0.1' }]);
        expect(page.sessions()?.length).toBe(1);
        expect(page.logins().length).toBe(1);
        expect(page.deviceIcon('Safari no iOS')).toContain('mobile');
        expect(page.deviceIcon('Chrome no Windows')).toContain('display');
        page.onTabChange('sessoes');
        controller.verify();
    });
});

describe('zonedDate', () => {
    beforeAll(() => registerLocaleData(localePt));

    it('mostra o instante no fuso informado', () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'pt-BR' }] });
        const pipe = TestBed.runInInjectionContext(() => new ZonedDatePipe());

        expect(pipe.transform('2026-07-01T12:00:00Z', 'dd/MM/yyyy HH:mm', 'America/Sao_Paulo')).toBe('01/07/2026 09:00');
        expect(pipe.transform('2026-07-01T12:00:00Z', 'dd/MM/yyyy HH:mm', 'Asia/Tokyo')).toBe('01/07/2026 21:00');
        expect(pipe.transform(null, 'short', 'UTC')).toBeNull();
        TestBed.resetTestingModule();
    });
});

describe('Visualizar imagem', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('abre o modal com a imagem e fecha pelo modelo', async () => {
        const { UiImagePreview } = await import('@/app/shared/ui/image-preview/image-preview');

        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const fixture = TestBed.createComponent(UiImagePreview);

        fixture.componentRef.setInput('src', 'data:image/gif;base64,R0lGODlhAQABAAAAACw=');
        fixture.componentRef.setInput('title', 'Sua foto');
        fixture.componentInstance.visible.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(document.body.querySelector('.p-dialog img')?.getAttribute('src')).toContain('data:image/gif');
        expect(document.body.querySelector('.p-dialog-header')?.textContent).toContain('Sua foto');
        expect(document.body.querySelectorAll('.p-dialog [role=toolbar] button').length).toBe(7);
        const preview = fixture.componentInstance;

        preview.tools[1].run();
        preview.tools[2].run();
        preview.tools[4].run();
        expect(preview.transform()).toBe('rotate(90deg) scale(-1.25, 1.25)');

        for (let step = 0; step < 10; step++) {
            preview.tools[2].run();
        }

        expect(preview.zoom()).toBe(3);
        expect(preview.tools[2].disabled()).toBeTrue();
        fixture.componentInstance.visible.set(false);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(fixture.componentInstance.visible()).toBeFalse();
        preview.visible.set(true);
        fixture.detectChanges();
        expect(preview.transform()).toBe('rotate(0deg) scale(1, 1)');
    });
});
