import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { authInterceptor } from '@/app/core/interceptors/auth.interceptor';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { SESSION_KEY } from '@/app/core/utils/session-data';
import { LayoutService } from '@/app/layout/service/layout.service';
import { ThemeService } from '@/app/layout/service/theme.service';
import { LoginResponse } from '@/app/types/auth';
import { DEFAULT_PREFERENCES, UserPreferences } from '@/app/types/preferences';
import { ConfiguracoesPage } from './configuracoes';

const URL = '/api/v1/me/preferences/';
const SAVED: UserPreferences = { preset: 'Aura', primary: 'green', dark_mode: false, menu_mode: 'static' };

function login(): LoginResponse {
    const token = `e30.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;

    return { access: token, refresh: token, user: { public_id: '019a0000-0000-7000-8000-000000000001', username: 'root', name: 'Root', is_superuser: true, must_change_password: false } };
}

function settle() {
    return new Promise((resolve) => setTimeout(resolve));
}

function configure() {
    TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }, MessageService]
    });
    TestBed.inject(AuthSessionService).setSession(login());
    const theme = TestBed.inject(ThemeService);

    spyOn(theme, 'apply').and.resolveTo();
    const fixture = TestBed.createComponent(ConfiguracoesPage);
    const page = fixture.componentInstance;

    fixture.detectChanges();
    const controller = TestBed.inject(HttpTestingController);

    controller.expectOne(URL).flush(SAVED);

    return { page, controller, theme };
}

describe('Configurações', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
    });

    it('aplica cada mudança na hora e grava só ao salvar', async () => {
        const { page, controller, theme } = configure();

        await settle();
        expect(page.dirty()).toBeFalse();
        page.change({ dark_mode: true, menu_mode: 'slim' });
        expect(theme.apply).toHaveBeenCalledWith({ ...SAVED, dark_mode: true, menu_mode: 'slim' });
        expect(page.dirty()).toBeTrue();
        page.save();
        const request = controller.expectOne(URL);

        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual({ ...SAVED, dark_mode: true, menu_mode: 'slim' });
        request.flush({ ...SAVED, dark_mode: true, menu_mode: 'slim' });
        await settle();
        expect(page.dirty()).toBeFalse();
    });

    it('sair sem salvar volta à aparência gravada', async () => {
        const { page, theme } = configure();

        await settle();
        page.change({ primary: 'rose' });
        page.ngOnDestroy();
        expect(theme.apply).toHaveBeenCalledWith(SAVED);
    });

    it('o tema aplica preset, cor, modo e menu no layout', async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const theme = TestBed.inject(ThemeService);
        const layout = TestBed.inject(LayoutService);

        await theme.apply({ ...DEFAULT_PREFERENCES, primary: 'noir', dark_mode: true, menu_mode: 'overlay' });
        expect(theme.current()).toEqual({ ...DEFAULT_PREFERENCES, primary: 'noir', dark_mode: true, menu_mode: 'overlay' });
        expect(document.documentElement.classList.contains('app-dark')).toBeTrue();
        await theme.apply(DEFAULT_PREFERENCES);
        expect(layout.layoutConfig().darkTheme).toBeFalse();
        expect(document.documentElement.classList.contains('app-dark')).toBeFalse();
        expect(TestBed.inject(Router)).toBeTruthy();
    });
});
