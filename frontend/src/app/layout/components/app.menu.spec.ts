import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ElementRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import pagesRoutes from '@/app/pages/pages.routes';
import { PROJECT_MENU } from '@/app/project/project.menu';
import { PROJECT_ROUTES } from '@/app/project/project.routes';
import { AppMenu } from './app.menu';

const SECTION = {
    label: 'Seção do projeto',
    icon: 'pi pi-fw pi-box',
    path: '/projeto',
    items: [{ label: 'Item do projeto', icon: 'pi pi-fw pi-box', permission: 'widget:view', routerLink: ['/pages/projeto'] }]
};

function createMenu(superuser: boolean, granted: string[]) {
    TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }, { provide: ElementRef, useValue: new ElementRef(null) }]
    });
    spyOn(TestBed.inject(AuthSessionService), 'getUser').and.returnValue({
        public_id: '019a0000-0000-7000-8000-000000000001',
        username: 'maria',
        name: 'Maria',
        is_superuser: superuser,
        must_change_password: false
    });
    spyOn(TestBed.inject(PermissionContextService), 'hasPermission').and.callFake((code: string) => granted.includes(code));

    return TestBed.runInInjectionContext(() => new AppMenu());
}

function projectSection(menu: AppMenu) {
    return menu.model.find((item) => item.label === SECTION.label);
}

describe('AppMenu project sections', () => {
    beforeEach(() => PROJECT_MENU.push(SECTION));

    afterEach(() => {
        PROJECT_MENU.length = 0;
        TestBed.resetTestingModule();
    });

    it('places project sections between Dashboards and Administração', () => {
        const labels = createMenu(false, ['widget:view'])
            .model.filter((item) => !item.separator)
            .map((item) => item.label);

        expect(labels.indexOf(SECTION.label)).toBeGreaterThan(labels.indexOf('Dashboards'));
        expect(labels.indexOf(SECTION.label)).toBeLessThan(labels.indexOf('Administração'));
    });

    it('shows a project item only to common users with its permission', () => {
        const allowed = projectSection(createMenu(false, ['widget:view']));

        expect(allowed.visible()).toBeTrue();
        expect(allowed.items[0].visible()).toBeTrue();
        expect(allowed.items[0].routerLink).toEqual(['/pages/projeto']);
        TestBed.resetTestingModule();

        expect(projectSection(createMenu(false, [])).visible()).toBeFalse();
        TestBed.resetTestingModule();

        expect(projectSection(createMenu(true, ['widget:view'])).visible()).toBeFalse();
    });
});

describe('pages routes', () => {
    afterEach(() => (PROJECT_ROUTES.length = 0));

    it('keeps project routes before the wildcard route', () => {
        const routes = pagesRoutes as Routes;
        const wildcard = routes.findIndex((route) => route.path === '**');

        expect(PROJECT_ROUTES.every((route) => routes.indexOf(route) < wildcard)).toBeTrue();
    });
});
