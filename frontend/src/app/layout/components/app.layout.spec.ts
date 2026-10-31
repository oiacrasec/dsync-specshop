import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { CONTEXT_KEY, SESSION_KEY } from '@/app/core/utils/session-data';
import { AppLayout } from './app.layout';

function jwt(seconds: number) {
    return `${btoa('{}')}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds }))}.signature`;
}

describe('AppLayout', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CONTEXT_KEY);
    });

    it('removes the outlet on logout so the current page is not recreated without a session', () => {
        TestBed.configureTestingModule({
            imports: [AppLayout],
            providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }, MessageService]
        });
        const session = TestBed.inject(AuthSessionService);

        session.setSession({ access: jwt(300), refresh: jwt(3600), user: { public_id: '019a0000-0000-7000-8000-000000000001', username: 'tester', name: 'Teste', is_superuser: false, must_change_password: false } });
        const fixture = TestBed.createComponent(AppLayout);

        fixture.detectChanges();
        TestBed.inject(HttpTestingController).match(() => true);
        expect(fixture.nativeElement.querySelectorAll('router-outlet').length).toBe(1);

        session.clearSession();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelectorAll('router-outlet').length).toBe(0);
    });
});
