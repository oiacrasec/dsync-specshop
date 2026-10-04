import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterModule } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

import { BehaviorSubject, filter } from 'rxjs';

interface Breadcrumb {
    label: string;
    url?: string;
}

@Component({
    selector: '[app-breadcrumb]',
    standalone: true,
    imports: [CommonModule, RouterModule, BreadcrumbModule],
    template: `<nav class="layout-breadcrumb" aria-label="Breadcrumb">
        <p-breadcrumb [model]="(menuItems$ | async) ?? []" [home]="homeItem"></p-breadcrumb>
    </nav>`
})
export class AppBreadcrumb {
    private readonly _menuItems$ = new BehaviorSubject<MenuItem[]>([]);
    readonly menuItems$ = this._menuItems$.asObservable();

    readonly homeItem: MenuItem = {
        icon: 'pi pi-home',
        routerLink: '/'
    };

    constructor(private router: Router) {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            this.updateBreadcrumbs();
        });
        this.updateBreadcrumbs();
    }

    private addBreadcrumb(route: ActivatedRouteSnapshot, parentUrl: string[], breadcrumbs: Breadcrumb[]) {
        const routeUrl = parentUrl.concat(route.url.map((url) => url.path));
        const routeData = route.routeConfig?.data ?? {};
        const parentRouteData = route.parent?.routeConfig?.data ?? {};
        const breadcrumb = routeData['breadcrumb'];
        const parentBreadcrumb = parentRouteData['breadcrumb'];
        const breadcrumbHidden = routeData['breadcrumbHidden'] === true;

        if (breadcrumb && breadcrumb !== parentBreadcrumb && !breadcrumbHidden) {
            breadcrumbs.push({
                label: String(breadcrumb),
                url: '/' + routeUrl.join('/')
            });
        }

        if (route.firstChild) {
            this.addBreadcrumb(route.firstChild, routeUrl, breadcrumbs);
        }
    }

    private updateBreadcrumbs() {
        const root = this.router.routerState.snapshot.root;
        const breadcrumbs: Breadcrumb[] = [];

        this.addBreadcrumb(root, [], breadcrumbs);
        this.ensureActionParentBreadcrumb(breadcrumbs);

        const menuItems: MenuItem[] = breadcrumbs.map((item) => ({
            label: item.label,
            disabled: true
        }));

        this._menuItems$.next(menuItems);
    }

    private ensureActionParentBreadcrumb(breadcrumbs: Breadcrumb[]) {
        if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) {
            return;
        }

        const lastIndex = breadcrumbs.length - 1;
        const current = breadcrumbs[lastIndex];

        if (!current?.label) {
            return;
        }

        const inferredParentLabel = this.extractParentLabelFromAction(current.label);

        if (!inferredParentLabel) {
            return;
        }

        const parentLabel = inferredParentLabel;

        if (!parentLabel) {
            return;
        }

        const previous = breadcrumbs[lastIndex - 1];

        if (previous?.label?.trim().toLowerCase() === parentLabel.toLowerCase()) {
            return;
        }

        breadcrumbs.splice(lastIndex, 0, { label: parentLabel });
    }

    private extractParentLabelFromAction(label: string): string | null {
        const value = String(label || '').trim();

        if (!value) {
            return null;
        }

        const patterns = [/^novo\s+(.+)$/i, /^nova\s+(.+)$/i, /^editar\s+(.+)$/i, /^editor\s+do\s+(.+)$/i, /^editor\s+da\s+(.+)$/i];

        for (const pattern of patterns) {
            const match = value.match(pattern);

            if (!match || !match[1]) {
                continue;
            }

            const parsed = String(match[1]).trim();

            if (!parsed) {
                continue;
            }

            return parsed.charAt(0).toUpperCase() + parsed.slice(1);
        }

        return null;
    }
}
