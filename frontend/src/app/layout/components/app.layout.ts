import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRouteSnapshot, Router, RouterModule } from '@angular/router';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { LayoutService } from '@/app/layout/service/layout.service';
import { AppConfigurator } from './app.configurator';
import { AppBreadcrumb } from '@/app/layout/components/app.breadcrumb';
import { AppFooter } from '@/app/layout/components/app.footer';
import { AppSearch } from '@/app/layout/components/app.search';
import { AppRightMenu } from '@/app/layout/components/app.rightmenu';
import { ToastModule } from 'primeng/toast';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, RouterModule, AppConfigurator, AppBreadcrumb, AppFooter, AppSearch, AppRightMenu, ToastModule],
    template: `
        <div class="layout-wrapper" [ngClass]="containerClass()">
            @if (shouldShowAppShell()) {
                <div app-sidebar></div>
                <div class="layout-content-wrapper">
                    <div class="layout-content-wrapper-inside">
                        <div app-topbar></div>
                        <div class="layout-content">
                            @if (shouldShowBreadcrumb()) {
                                <div app-breadcrumb></div>
                            }
                            <router-outlet></router-outlet>
                        </div>
                        <div app-footer></div>
                    </div>
                </div>
                <app-configurator />
                <div app-search></div>
                <div app-rightmenu></div>
                <div class="layout-mask"></div>
            } @else {
                <div class="layout-content-wrapper">
                    <div class="layout-content-wrapper-inside">
                        <div class="layout-content">
                            <router-outlet></router-outlet>
                        </div>
                    </div>
                </div>
            }
        </div>
    `
})
export class AppLayout {
    layoutService: LayoutService = inject(LayoutService);
    private authSession = inject(AuthSessionService);
    private userContextService = inject(UserContextService);
    private router = inject(Router);

    containerClass = computed(() => {
        const layoutConfig = this.layoutService.layoutConfig();
        const layoutState = this.layoutService.layoutState();

        return {
            'layout-overlay': layoutConfig.menuMode === 'overlay',
            'layout-static': layoutConfig.menuMode === 'static',
            'layout-slim': layoutConfig.menuMode === 'slim',
            'layout-horizontal': layoutConfig.menuMode === 'horizontal',
            'layout-compact': layoutConfig.menuMode === 'compact',
            'layout-reveal': layoutConfig.menuMode === 'reveal',
            'layout-drawer': layoutConfig.menuMode === 'drawer',
            'layout-overlay-active': layoutState.overlayMenuActive,
            'layout-mobile-active': layoutState.mobileMenuActive,
            'layout-static-inactive': layoutState.staticMenuInactive,
            'layout-sidebar-expanded': layoutState.sidebarExpanded,
            'layout-sidebar-anchored': layoutState.anchored
        };
    });

    shouldShowAppShell() {
        const user = this.authSession.getUser();
        if (user?.is_superuser) {
            return true;
        }
        return this.userContextService.hasActiveContext();
    }

    shouldShowBreadcrumb() {
        let current: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
        while (current) {
            if (current.data?.['hideBreadcrumbBar'] === true) {
                return false;
            }
            current = current.firstChild ?? null;
        }
        return true;
    }
}
