import { Injectable, effect, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export type ColorScheme = 'light' | 'dark' | 'dim';

export type MenuMode = 'static' | 'overlay' | 'slim' | 'slim-plus' | 'horizontal' | 'compact' | 'reveal' | 'drawer';

export interface LayoutConfig {
    preset: string;
    primary: string;
    darkTheme: boolean;
    menuMode: MenuMode;
}

interface LayoutState {
    staticMenuInactive: boolean;
    overlayMenuActive: boolean;
    rightMenuVisible: boolean;
    configSidebarVisible: boolean;
    mobileMenuActive: boolean;
    searchBarActive: boolean;
    sidebarExpanded: boolean;
    menuHoverActive: boolean;
    activePath: any;
    anchored: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    layoutConfig = signal<LayoutConfig>({
        preset: 'Aura',
        primary: 'blue',
        darkTheme: false,
        menuMode: 'static'
    });

    layoutState = signal<LayoutState>({
        staticMenuInactive: false,
        overlayMenuActive: false,
        rightMenuVisible: false,
        configSidebarVisible: false,
        mobileMenuActive: false,
        searchBarActive: false,
        sidebarExpanded: false,
        menuHoverActive: false,
        activePath: null,
        anchored: false
    });

    bodyBackgroundPalette = {
        light: {
            noir: 'linear-gradient(180deg, #F4F4F5 0%, rgba(212, 212, 216, 0.12) 100%)',
            blue: 'linear-gradient(180deg, #e0e7f5 0%, rgba(170, 194, 239, 0.06) 111.26%)',
            green: 'linear-gradient(180deg, #e0f5e1 0%, rgba(170, 239, 172, 0.06) 111.26%)',
            violet: 'linear-gradient(180deg, #e9e0f5 0%, rgba(198, 170, 239, 0.06) 111.26%)',
            orange: 'linear-gradient(180deg, #f5e9e0 0%, rgba(239, 199, 170, 0.06) 111.26%)',
            rose: 'linear-gradient(180deg, #f5e0e3 0%, rgba(239, 170, 180, 0.06) 111.26%)',
            cyan: 'linear-gradient(180deg, #e0f2f5 0%, rgba(170, 229, 239, 0.06) 111.26%)',
            pink: 'linear-gradient(180deg, #f5e0eb 0%, rgba(239, 170, 205, 0.06) 111.26%)',
            red: 'linear-gradient(180deg, #f5e0e0 0%, rgba(239, 170, 170, 0.06) 111.26%)',
            amber: 'linear-gradient(180deg, #f5ede0 0%, rgba(239, 214, 170, 0.06) 111.26%)',
            yellow: 'linear-gradient(180deg, #f5f0e0 0%, rgba(239, 222, 170, 0.06) 111.26%)',
            lime: 'linear-gradient(180deg, #edf5e0 0%, rgba(212, 239, 170, 0.06) 111.26%)',
            emerald: 'linear-gradient(180deg, #e0f5ee 0%, rgba(170, 239, 216, 0.06) 111.26%)',
            teal: 'linear-gradient(180deg, #e0f5f3 0%, rgba(170, 239, 231, 0.06) 111.26%)',
            sky: 'linear-gradient(180deg, #e0eef5 0%, rgba(170, 217, 239, 0.06) 111.26%)',
            purple: 'linear-gradient(180deg, #ebe0f5 0%, rgba(206, 170, 239, 0.06) 111.26%)',
            fuchsia: 'linear-gradient(180deg, #f2e0f5 0%, rgba(230, 170, 239, 0.06) 111.26%)',
            indigo: 'linear-gradient(180deg, #e0e1f5 0%, rgba(170, 171, 239, 0.06) 111.26%)'
        },
        dark: {
            noir: '#09090b',
            blue: '#000C23',
            green: '#00231B',
            violet: '#0E0023',
            orange: '#231500',
            rose: '#230023',
            cyan: '#001E23',
            pink: '#230012',
            red: '#230000',
            amber: '#231600',
            yellow: '#231B00',
            lime: '#152300',
            emerald: '#002318',
            teal: '#00231F',
            sky: '#001823',
            purple: '#120023',
            fuchsia: '#1F0023',
            indigo: '#000123'
        }
    };

    router = inject(Router);

    isDarkTheme = computed(() => this.layoutConfig().darkTheme);

    isSlim = computed(() => this.layoutConfig().menuMode === 'slim');

    isHorizontal = computed(() => this.layoutConfig().menuMode === 'horizontal');

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    isCompact = computed(() => this.layoutConfig().menuMode === 'compact');

    isStatic = computed(() => this.layoutConfig().menuMode === 'static');

    isReveal = computed(() => this.layoutConfig().menuMode === 'reveal');

    isDrawer = computed(() => this.layoutConfig().menuMode === 'drawer');

    hasOverlaySubmenu = computed(() => this.isSlim() || this.isHorizontal() || this.isCompact());

    hasOpenOverlay = computed(() => this.layoutState().overlayMenuActive || this.hasOpenOverlaySubmenu());

    hasOpenOverlaySubmenu = computed(() => {
        return this.hasOverlaySubmenu() && !!this.layoutState().activePath;
    });

    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().mobileMenuActive);

    isSidebarStateChanged = computed(() => {
        const layoutConfig = this.layoutConfig();
        return layoutConfig.menuMode === 'horizontal' || layoutConfig.menuMode === 'slim' || layoutConfig.menuMode === 'slim-plus' || layoutConfig.menuMode === 'compact';
    });

    private initialized = false;

    private previousMenuMode: string | undefined = undefined;

    constructor() {
        effect(() => {
            const config = this.layoutConfig();

            if (!this.initialized || !config) {
                this.initialized = true;
                return;
            }

            this.handleDarkModeTransition(config);
        });

        effect(() => {
            this.updateMenuState();
        });
    }

    private updateMenuState() {
        const menuMode = this.layoutConfig().menuMode;
        if (this.previousMenuMode === undefined) {
            this.previousMenuMode = menuMode;
            return;
        }

        if (this.previousMenuMode === menuMode) {
            return;
        }

        this.previousMenuMode = menuMode;

        const isOverlaySubmenu = menuMode === 'slim' || menuMode === 'slim-plus' || menuMode === 'horizontal' || menuMode === 'compact';

        this.layoutState.update((prev) => ({
            ...prev,
            staticMenuDesktopInactive: false,
            overlayMenuActive: false,
            mobileMenuActive: false,
            sidebarExpanded: false,
            menuHoverActive: false,
            anchored: false,
            activePath: this.isDesktop() ? (isOverlaySubmenu ? null : this.router.url) : prev.activePath
        }));
    }

    private handleDarkModeTransition(config: LayoutConfig): void {
        const supportsViewTransition = 'startViewTransition' in document;

        if (supportsViewTransition) {
            this.startViewTransition(config);
        } else {
            this.toggleDarkMode(config);
        }
    }

    private startViewTransition(config: LayoutConfig): void {
        (document as any).startViewTransition(() => {
            this.toggleDarkMode(config);
        });
    }

    toggleDarkMode(config?: LayoutConfig): void {
        const _config = config || this.layoutConfig();
        if (_config.darkTheme) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
    }

    changeMenuMode(mode: MenuMode) {
        this.layoutConfig.update((prev) => ({ ...prev, menuMode: mode }));
        this.layoutState.update((prev) => ({
            ...prev,
            staticMenuDesktopInactive: false,
            overlayMenuActive: false,
            mobileMenuActive: false,
            sidebarExpanded: false,
            menuHoverActive: false,
            anchored: false
        }));

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, activePath: this.hasOverlaySubmenu() ? null : this.router.url }));
        }
    }

    toggleMenu() {
        if (this.isDesktop()) {
            if (this.layoutConfig().menuMode === 'static') {
                this.layoutState.update((prev) => ({ ...prev, staticMenuInactive: !prev.staticMenuInactive }));
            }

            if (this.layoutConfig().menuMode === 'overlay') {
                this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !prev.overlayMenuActive }));
            }
        } else {
            this.layoutState.update((prev) => ({ ...prev, mobileMenuActive: !prev.mobileMenuActive }));
        }
    }

    onMenuToggle() {
        this.toggleMenu();
    }

    toggleConfigSidebar() {
        this.layoutState.update((prev) => ({
            ...prev,
            configSidebarVisible: !prev.configSidebarVisible
        }));
    }

    showConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: true }));
    }

    hideConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: false }));
    }

    toggleRightMenu() {
        this.layoutState.update((prev) => ({ ...prev, rightMenuVisible: !prev.rightMenuVisible }));
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    updateBodyBackground(color: string) {
        const root = document.documentElement;
        const colorScheme: any = this.isDarkTheme() ? this.bodyBackgroundPalette.dark : this.bodyBackgroundPalette.light;
        root.style.setProperty('--surface-ground', colorScheme[color]);
    }
}
