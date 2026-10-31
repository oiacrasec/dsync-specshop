import { Component, computed, effect, ElementRef, inject, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { AppMenu } from './app.menu';
import { LayoutService } from '@/app/layout/service/layout.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AppTopbar } from '@/app/layout/components/app.topbar';
import { CommonModule } from '@angular/common';
import { filter, Subject, takeUntil } from 'rxjs';
import { UserContextService } from '@/app/core/services/user-context.service';

const BREAKPOINT = 992;
// Worst case (drawer expanded): ~146px available for organization text at 0.9rem semibold.
// 20 chars keeps the label readable without breaking layout, counting "..." in the limit.

@Component({
    selector: '[app-sidebar]',
    standalone: true,
    imports: [CommonModule, AppMenu, RouterModule, AppTopbar],
    template: ` <div class="sidebar-header">
            <a class="logo" [routerLink]="['/']">
                <img class="logo-image" src="/layout/images/logo-{{ layoutService.isDarkTheme() ? 'white' : 'dark' }}.svg" alt="logo" />
                <div class="brand-block">
                    @if (getOrganizationName(); as organizationName) {
                        <span class="organization-name" [attr.title]="organizationName">
                            {{ organizationName }}
                        </span>
                    }
                </div>
            </a>
            <button class="layout-sidebar-anchor z-2" type="button" (click)="onAnchorToggle()"></button>
        </div>

        <div class="layout-menu-shell" [class.layout-menu-shell--card]="shouldUseMenuCard()">
            <div #menuContainerWrapper class="layout-menu-container" (scroll)="onMenuScroll()">
                <div #menuContainer app-menu></div>
            </div>
        </div>
        @if (layoutService.isHorizontal() && layoutService.isDesktop()) {
            <div app-topbar></div>
        }`,
    host: {
        class: 'layout-sidebar',
        '(mouseenter)': 'onMouseEnter()',
        '(mouseleave)': 'onMouseLeave()'
    }
})
export class AppSidebar implements OnInit, OnDestroy {
    layoutService = inject(LayoutService);

    router = inject(Router);

    el = inject(ElementRef);

    private userContextService = inject(UserContextService);

    @ViewChild('menuContainer') menuContainer!: AppMenu;

    @ViewChild('menuContainerWrapper') menuContainerWrapper!: ElementRef;

    private timeout: any = null;

    private observer: IntersectionObserver | null = null;

    private outsideClickListener: ((event: MouseEvent) => void) | null = null;

    private scrollListener: (() => void) | null = null;

    private mediaQuery = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);

    private destroy$ = new Subject<void>();

    isHorizontal = computed(() => this.layoutService.isHorizontal());

    isDrawer = computed(() => this.layoutService.layoutConfig().menuMode === 'drawer');

    isReveal = computed(() => this.layoutService.layoutConfig().menuMode === 'reveal');

    isAnchored = computed(() => this.layoutService.layoutState().anchored);

    constructor() {
        effect(() => {
            const hasOpenOverlay = this.layoutService.hasOpenOverlay();
            const mobileMenuActive = this.layoutService.layoutState().mobileMenuActive;

            if (this.layoutService.isDesktop()) {
                if (hasOpenOverlay) {
                    this.bindOutsideClickListener();
                } else {
                    this.unbindOutsideClickListener();
                }
            } else {
                if (mobileMenuActive) {
                    this.bindOutsideClickListener();
                } else {
                    this.unbindOutsideClickListener();
                }
            }
        });

        effect(() => {
            const hasOpenOverlaySubmenu = this.layoutService.hasOpenOverlaySubmenu();

            if (this.layoutService.isDesktop()) {
                if (hasOpenOverlaySubmenu) {
                    setTimeout(() => this.setupIntersectionObserver());
                } else {
                    this.unbindObserver();
                }
            }
        });

        effect(() => {
            const hasOpenOverlay = this.layoutService.hasOpenOverlay();

            if (this.layoutService.isHorizontal() && this.layoutService.isDesktop()) {
                if (hasOpenOverlay) {
                    this.bindScrollListener();
                } else {
                    this.unbindScrollListener();
                }
            } else {
                this.unbindScrollListener();
            }
        });
    }

    ngOnInit() {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntil(this.destroy$)
            )
            .subscribe((event) => {
                const navEvent = event as NavigationEnd;

                this.onRouteChange(navEvent.urlAfterRedirects);
            });

        this.onRouteChange(this.router.url);

        this.mediaQuery.addEventListener('change', this.screenChangeListener);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        this.unbindOutsideClickListener();
        this.unbindScrollListener();
        this.unbindObserver();
        this.mediaQuery.removeEventListener('change', this.screenChangeListener);
    }

    private onRouteChange(path: string) {
        let newActivePath: string | null;

        if (this.layoutService.hasOverlaySubmenu() && this.layoutService.isDesktop()) {
            newActivePath = null;
        } else {
            newActivePath = path;
        }

        this.layoutService.layoutState.update((val) => ({
            ...val,
            activePath: newActivePath,
            overlayMenuActive: false,
            mobileMenuActive: false,
            menuHoverActive: false
        }));
    }

    private screenChangeListener = () => {
        if (this.layoutService.hasOverlaySubmenu()) {
            this.layoutService.layoutState.update((val) => ({
                ...val,
                activePath: this.layoutService.isDesktop() ? null : this.router.url,
                menuHoverActive: false
            }));
            this.unbindOutsideClickListener();
            this.unbindObserver();
        }
    };

    private bindOutsideClickListener() {
        if (!this.outsideClickListener) {
            this.outsideClickListener = (event: MouseEvent) => {
                if (this.isOutsideClicked(event)) {
                    if (this.layoutService.isDesktop()) {
                        this.layoutService.layoutState.update((val) => ({
                            ...val,
                            overlayMenuActive: false
                        }));

                        if (this.layoutService.hasOverlaySubmenu()) {
                            this.layoutService.layoutState.update((val) => ({
                                ...val,
                                activePath: null,
                                menuHoverActive: false
                            }));
                        }
                    } else {
                        this.layoutService.layoutState.update((val) => ({
                            ...val,
                            mobileMenuActive: false
                        }));
                    }
                }
            };

            document.addEventListener('click', this.outsideClickListener);
        }
    }

    private unbindOutsideClickListener() {
        if (this.outsideClickListener) {
            document.removeEventListener('click', this.outsideClickListener);
            this.outsideClickListener = null;
        }
    }

    private bindScrollListener() {
        if (!this.scrollListener) {
            this.scrollListener = () => {
                if (this.layoutService.isHorizontal() && this.layoutService.isDesktop() && this.layoutService.hasOpenOverlay()) {
                    this.layoutService.layoutState.update((val) => ({
                        ...val,
                        overlayMenuActive: false,
                        activePath: null,
                        menuHoverActive: false
                    }));
                }
            };

            document.addEventListener('scroll', this.scrollListener, true);
        }
    }

    private unbindScrollListener() {
        if (this.scrollListener) {
            document.removeEventListener('scroll', this.scrollListener, true);
            this.scrollListener = null;
        }
    }

    private isOutsideClicked(event: MouseEvent): boolean {
        const topbarButtonEl = document.querySelector('.topbar-left > a');
        const sidebarEl = this.el.nativeElement;

        return !(sidebarEl?.isSameNode(event.target as Node) || sidebarEl?.contains(event.target as Node) || topbarButtonEl?.isSameNode(event.target as Node) || topbarButtonEl?.contains(event.target as Node));
    }

    onMouseEnter() {
        if (!this.isAnchored() && (this.isDrawer() || this.isReveal())) {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }

            this.layoutService.layoutState.update((state) => ({
                ...state,
                sidebarExpanded: true
            }));
        }
    }

    onMouseLeave() {
        if (!this.layoutService.layoutState().anchored && !this.timeout) {
            this.timeout = setTimeout(() => {
                this.layoutService.layoutState.update((state) => ({
                    ...state,
                    sidebarExpanded: false
                }));
            }, 300);
        }
    }

    onAnchorToggle() {
        this.layoutService.layoutState.update((state) => ({
            ...state,
            anchored: !state.anchored
        }));
    }

    shouldUseMenuCard() {
        return this.layoutService.isStatic() || this.layoutService.isOverlay();
    }

    getOrganizationName(): string | null {
        return this.userContextService.getActiveContext()?.organization_name?.trim() ?? null;
    }

    onMenuScroll() {
        if (this.menuContainerWrapper?.nativeElement && this.menuContainer?.el.nativeElement) {
            if (this.layoutService.isHorizontal()) {
                const scrollLeft = this.menuContainerWrapper.nativeElement.scrollLeft;

                this.menuContainer.el.nativeElement.style.setProperty('--menu-scroll-x', `-${scrollLeft}px`);
            } else {
                const scrollTop = this.menuContainerWrapper.nativeElement.scrollTop;

                this.menuContainer.el.nativeElement.style.setProperty('--menu-scroll-y', `-${scrollTop}px`);
            }
        }

        if (this.layoutService.hasOverlaySubmenu() && this.layoutService.isDesktop()) {
            this.layoutService.layoutState.update((val) => ({
                ...val,
                activePath: null,
                menuHoverActive: false
            }));
        }
    }

    private setupIntersectionObserver() {
        if (!this.menuContainer?.el.nativeElement) return;

        if (this.observer) {
            this.observer.disconnect();
        }

        const activeMenuItem = this.menuContainer.el.nativeElement.querySelector('.layout-root-menuitem.active-menuitem');

        if (!activeMenuItem) return;

        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (this.layoutService.isDesktop() && !entry.isIntersecting && this.layoutService.hasOverlaySubmenu() && this.layoutService.layoutState().activePath) {
                        this.layoutService.layoutState.update((val) => ({
                            ...val,
                            activePath: null
                        }));
                    }
                });
            },
            {
                root: this.menuContainerWrapper.nativeElement,
                threshold: 0
            }
        );

        this.observer.observe(activeMenuItem);
    }

    private unbindObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
