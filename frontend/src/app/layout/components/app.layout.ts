import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRouteSnapshot, Router, RouterModule } from '@angular/router';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { LayoutService } from '@/app/layout/service/layout.service';
import { AppBreadcrumb } from '@/app/layout/components/app.breadcrumb';
import { AppFooter } from '@/app/layout/components/app.footer';
import { AppSearch } from '@/app/layout/components/app.search';
import { AppRightMenu } from '@/app/layout/components/app.rightmenu';
import { ToastModule } from 'primeng/toast';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PreferencesService } from '@/app/core/services/preferences.service';
import { ProfileService } from '@/app/core/services/profile.service';
import { UserContextService } from '@/app/core/services/user-context.service';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, RouterModule, AppBreadcrumb, AppFooter, AppSearch, AppRightMenu, ToastModule],
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
                <div app-search></div>
                <div app-rightmenu></div>
                <div class="layout-mask"></div>
            } @else if (hasSession()) {
                <!-- Sem menu (seleção de organização e troca de senha após o login): card centralizado na vertical.
                     Sem sessão não há outlet: ao sair, a página atual não é recriada antes de ir ao login. -->
                <div class="layout-content-wrapper">
                    <div class="layout-content-wrapper-inside">
                        <div class="layout-content flex flex-col justify-center py-8">
                            <router-outlet></router-outlet>
                        </div>
                    </div>
                </div>
            }
        </div>
    `
})
export class AppLayout implements OnInit {
    layoutService: LayoutService = inject(LayoutService);
    private preferences = inject(PreferencesService);
    private profile = inject(ProfileService);
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

    ngOnInit() {
        this.preferences.load().subscribe({ error: () => undefined });
        this.profile.load().subscribe({ error: () => undefined });
    }

    hasSession() {
        return !!this.authSession.getUser();
    }

    shouldShowAppShell() {
        const user = this.authSession.getUser();

        if (user?.is_superuser) {
            return true;
        }

        return !!user && !user.must_change_password && this.userContextService.hasActiveContext();
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
