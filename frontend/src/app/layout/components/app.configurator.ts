import { CommonModule, isPlatformBrowser } from '@angular/common';
import { booleanAttribute, Component, computed, inject, Input, model, OnInit, PLATFORM_ID, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { $t, updatePreset, updateSurfacePalette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
import { PrimeNG } from 'primeng/config';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LayoutService, MenuMode } from '@/app/layout/service/layout.service';
import { Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';

const presets = {
    Aura,
    Lara,
    Nora
} as const;

declare type KeyOfType<T> = keyof T extends infer U ? U : never;

declare type SurfacesType = {
    name?: string;
    palette?: {
        0?: string;
        50?: string;
        100?: string;
        200?: string;
        300?: string;
        400?: string;
        500?: string;
        600?: string;
        700?: string;
        800?: string;
        900?: string;
        950?: string;
    };
};

@Component({
    selector: 'app-configurator',
    standalone: true,
    imports: [CommonModule, FormsModule, SelectButtonModule, DrawerModule, ToggleSwitchModule, RadioButtonModule],
    template: `
        <p-drawer [visible]="visible()" (onHide)="onDrawerHide()" position="right" [transitionOptions]="'.3s cubic-bezier(0, 0, 0.2, 1)'" class="layout-config-sidebar w-80" header="Settings">
            <div class="flex flex-col gap-6">
                <div>
                    <span class="text-lg text-muted-color font-semibold">Primary</span>
                    <div class="pt-2 flex gap-2 flex-wrap">
                        @for (primaryColor of primaryColors(); track primaryColor.name) {
                            <button
                                type="button"
                                [title]="primaryColor.name"
                                (click)="updateColors($event, 'primary', primaryColor)"
                                class="w-6 h-6 cursor-pointer hover:shadow-lg rounded duration-150 flex items-center justify-center"
                                [style]="{
                                    'background-color': primaryColor?.name === 'noir' ? 'var(--text-color)' : primaryColor?.palette?.['500']
                                }"
                            >
                                @if (primaryColor.name === selectedPrimaryColor()) {
                                    <i class="pi pi-check text-white"></i>
                                }
                            </button>
                        }
                    </div>
                </div>

                <div>
                    <div class="flex flex-col gap-2">
                        <span class="text-lg text-muted-color font-semibold">Presets</span>
                        <p-selectbutton [options]="presets" [ngModel]="selectedPreset()" (ngModelChange)="onPresetChange($event)" [allowEmpty]="false"></p-selectbutton>
                    </div>
                </div>
                <div>
                    <div class="flex flex-col gap-2">
                        <span class="text-lg text-muted-color font-semibold">Color Scheme</span>
                        <p-selectbutton [ngModel]="darkTheme()" (ngModelChange)="toggleDarkMode()" [options]="themeOptions" optionLabel="name" optionValue="value" [allowEmpty]="false"></p-selectbutton>
                    </div>
                </div>

                @if (!simple && location === 'app') {
                    <div>
                        <div class="flex flex-col gap-2">
                            <span class="text-lg text-muted-color font-semibold">Menu Type</span>
                            <div class="flex flex-wrap flex-col gap-3">
                                <div class="flex">
                                    <div class="flex items-center gap-2 w-6/12">
                                        <p-radio-button name="menuMode" value="static" [(ngModel)]="menuMode" (ngModelChange)="setMenuMode('static')" inputId="static"></p-radio-button>
                                        <label for="static">Static</label>
                                    </div>

                                    <div class="flex items-center gap-2 w-6/12">
                                        <p-radio-button name="menuMode" value="overlay" [(ngModel)]="menuMode" (ngModelChange)="setMenuMode('overlay')" inputId="overlay"></p-radio-button>
                                        <label for="overlay">Overlay</label>
                                    </div>
                                </div>
                                <div class="flex">
                                    <div class="flex items-center gap-2 w-6/12">
                                        <p-radio-button name="menuMode" value="slim" [(ngModel)]="menuMode" (ngModelChange)="setMenuMode('slim')" inputId="slim"></p-radio-button>
                                        <label for="slim">Slim</label>
                                    </div>
                                    <div class="flex items-center gap-2 w-6/12">
                                        <p-radio-button name="menuMode" value="compact" [(ngModel)]="menuMode" (ngModelChange)="setMenuMode('compact')" inputId="compact"></p-radio-button>
                                        <label for="compact">Compact</label>
                                    </div>
                                </div>
                                <div class="flex">
                                    <div class="flex items-center gap-2 w-6/12">
                                        <p-radio-button name="menuMode" value="reveal" [(ngModel)]="menuMode" (ngModelChange)="setMenuMode('reveal')" inputId="reveal"></p-radio-button>
                                        <label for="reveal">Reveal</label>
                                    </div>
                                    <div class="flex items-center gap-2 w-6/12">
                                        <p-radio-button name="menuMode" value="drawer" [(ngModel)]="menuMode" (ngModelChange)="setMenuMode('drawer')" inputId="drawer"></p-radio-button>
                                        <label for="drawer">Drawer</label>
                                    </div>
                                </div>
                                <div class="flex">
                                    <div class="flex items-center gap-2 w-6/12">
                                        <p-radio-button name="menuMode" value="horizontal" [(ngModel)]="menuMode" (ngModelChange)="setMenuMode('horizontal')" inputId="horizontal"></p-radio-button>
                                        <label for="horizontal">Horizontal</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </div>
        </p-drawer>
    `
})
export class AppConfigurator implements OnInit {
    @Input({ transform: booleanAttribute }) simple: boolean = false;

    @Input() location: string = 'app';

    router = inject(Router);

    config: PrimeNG = inject(PrimeNG);

    layoutService: LayoutService = inject(LayoutService);

    platformId = inject(PLATFORM_ID);

    primeng = inject(PrimeNG);

    presets = Object.keys(presets);

    themeOptions = [
        { name: 'Light', value: false },
        { name: 'Dark', value: true }
    ];

    menuThemeOptions: { name: string; value: string }[] = [];

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.onPresetChange(this.layoutService.layoutConfig().preset);
        }

        this.updateMenuThemeOptions();
    }

    updateMenuThemeOptions() {
        if (this.darkTheme()) {
            this.menuThemeOptions = [
                { name: 'Dark', value: 'dark' },
                { name: 'Primary', value: 'primary' }
            ];
        } else {
            this.menuThemeOptions = [
                { name: 'Light', value: 'light' },
                { name: 'Dark', value: 'dark' },
                { name: 'Primary', value: 'primary' }
            ];
        }
    }

    selectedPrimaryColor = computed(() => this.layoutService.layoutConfig().primary);

    selectedPreset = computed(() => this.layoutService.layoutConfig().preset);

    menuMode = model(this.layoutService.layoutConfig().menuMode);

    visible: Signal<boolean> = computed(() => this.layoutService.layoutState().configSidebarVisible);

    darkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);

    primaryColors = computed<SurfacesType[]>(() => {
        const presetPalette = presets[this.layoutService.layoutConfig().preset as KeyOfType<typeof presets>].primitive;
        const colors = ['emerald', 'green', 'lime', 'orange', 'amber', 'yellow', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
        const palettes: SurfacesType[] = [{ name: 'noir', palette: {} }];

        colors.forEach((color) => {
            palettes.push({
                name: color,
                palette: presetPalette?.[color as KeyOfType<typeof presetPalette>] as SurfacesType['palette']
            });
        });

        return palettes;
    });

    getPresetExt() {
        const color: SurfacesType = this.primaryColors().find((c) => c.name === this.selectedPrimaryColor()) || {};

        if (color.name === 'noir') {
            return {
                semantic: {
                    primary: {
                        50: '{zinc.50}',
                        100: '{zinc.100}',
                        200: '{zinc.200}',
                        300: '{zinc.300}',
                        400: '{zinc.400}',
                        500: '{zinc.500}',
                        600: '{zinc.600}',
                        700: '{zinc.700}',
                        800: '{zinc.800}',
                        900: '{zinc.900}',
                        950: '{zinc.950}'
                    },
                    colorScheme: {
                        light: {
                            primary: {
                                color: '{primary.950}',
                                contrastColor: '#ffffff',
                                hoverColor: '{primary.800}',
                                activeColor: '{primary.700}'
                            },
                            highlight: {
                                background: '{primary.950}',
                                focusBackground: '{primary.700}',
                                color: '#ffffff',
                                focusColor: '#ffffff'
                            },
                            surface: {
                                0: '#ffffff',
                                50: '{zinc.50}',
                                100: '{zinc.100}',
                                200: '{zinc.200}',
                                300: '{zinc.300}',
                                400: '{zinc.400}',
                                500: '{zinc.500}',
                                600: '{zinc.600}',
                                700: '{zinc.700}',
                                800: '{zinc.800}',
                                900: '{zinc.900}',
                                950: '{zinc.950}'
                            }
                        },
                        dark: {
                            primary: {
                                color: '{primary.50}',
                                contrastColor: '{primary.950}',
                                hoverColor: '{primary.200}',
                                activeColor: '{primary.300}'
                            },
                            highlight: {
                                background: '{primary.50}',
                                focusBackground: '{primary.300}',
                                color: '{primary.950}',
                                focusColor: '{primary.950}'
                            },
                            surface: {
                                0: '#ffffff',
                                50: '{zinc.50}',
                                100: '{zinc.100}',
                                200: '{zinc.200}',
                                300: '{zinc.300}',
                                400: '{zinc.400}',
                                500: '{zinc.500}',
                                600: '{zinc.600}',
                                700: '{zinc.700}',
                                800: '{zinc.800}',
                                900: '{zinc.900}',
                                950: '{zinc.950}'
                            }
                        }
                    }
                }
            };
        } else {
            return {
                semantic: {
                    primary: color.palette,
                    colorScheme: {
                        light: {
                            primary: {
                                color: '{primary.500}',
                                contrastColor: '#ffffff',
                                hoverColor: '{primary.600}',
                                activeColor: '{primary.700}'
                            },
                            highlight: {
                                background: '{primary.50}',
                                focusBackground: '{primary.100}',
                                color: '{primary.700}',
                                focusColor: '{primary.800}'
                            },
                            surface: {
                                0: 'color-mix(in srgb, {primary.900}, white 100%)',
                                50: 'color-mix(in srgb, {primary.900}, white 95%)',
                                100: 'color-mix(in srgb, {primary.900}, white 90%)',
                                200: 'color-mix(in srgb, {primary.900}, white 80%)',
                                300: 'color-mix(in srgb, {primary.900}, white 70%)',
                                400: 'color-mix(in srgb, {primary.900}, white 60%)',
                                500: 'color-mix(in srgb, {primary.900}, white 50%)',
                                600: 'color-mix(in srgb, {primary.900}, white 40%)',
                                700: 'color-mix(in srgb, {primary.900}, white 30%)',
                                800: 'color-mix(in srgb, {primary.900}, white 20%)',
                                900: 'color-mix(in srgb, {primary.900}, white 10%)',
                                950: 'color-mix(in srgb, {primary.900}, white 0%)'
                            }
                        },
                        dark: {
                            primary: {
                                color: '{primary.400}',
                                contrastColor: '{surface.900}',
                                hoverColor: '{primary.300}',
                                activeColor: '{primary.200}'
                            },
                            highlight: {
                                background: 'color-mix(in srgb, {primary.400}, transparent 84%)',
                                focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)',
                                color: 'rgba(255,255,255,.87)',
                                focusColor: 'rgba(255,255,255,.87)'
                            },
                            surface: {
                                0: 'color-mix(in srgb, var(--surface-ground), white 100%)',
                                50: 'color-mix(in srgb, var(--surface-ground), white 95%)',
                                100: 'color-mix(in srgb, var(--surface-ground), white 90%)',
                                200: 'color-mix(in srgb, var(--surface-ground), white 80%)',
                                300: 'color-mix(in srgb, var(--surface-ground), white 70%)',
                                400: 'color-mix(in srgb, var(--surface-ground), white 60%)',
                                500: 'color-mix(in srgb, var(--surface-ground), white 50%)',
                                600: 'color-mix(in srgb, var(--surface-ground), white 40%)',
                                700: 'color-mix(in srgb, var(--surface-ground), white 30%)',
                                800: 'color-mix(in srgb, var(--surface-ground), white 20%)',
                                900: 'color-mix(in srgb, var(--surface-ground), white 10%)',
                                950: 'color-mix(in srgb, var(--surface-ground), white 5%)'
                            }
                        }
                    }
                }
            };
        }
    }

    updateColors(event: any, type: string, color: any) {
        if (type === 'primary') {
            this.layoutService.layoutConfig.update((state) => ({
                ...state,
                primary: color.name
            }));
        }

        this.applyTheme(type, color);
        this.layoutService.updateBodyBackground(color.name);
        event.stopPropagation();
    }

    applyTheme(type: string, color: any) {
        if (type === 'primary') {
            updatePreset(this.getPresetExt());
        } else if (type === 'surface') {
            updateSurfacePalette(color.palette);
        }
    }

    onPresetChange(event: any) {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            preset: event
        }));
        const preset = presets[event as KeyOfType<typeof presets>];

        $t().preset(preset).preset(this.getPresetExt()).use({ useDefaultOptions: true });
    }

    onDrawerHide() {
        this.layoutService.hideConfigSidebar();
    }

    setMenuMode(mode: MenuMode) {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            menuMode: mode
        }));

        if (this.menuMode() === 'static') {
            this.layoutService.layoutState.update((state) => ({
                ...state,
                staticMenuDesktopInactive: false
            }));
        }
    }

    toggleDarkMode() {
        this.executeDarkModeToggle();
    }

    executeDarkModeToggle() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));

        if (this.darkTheme()) {
            this.setMenuTheme('dark');
        }

        this.updateMenuThemeOptions();
        this.layoutService.updateBodyBackground(this.layoutService.layoutConfig().primary);
    }

    setMenuTheme(theme: string) {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            menuTheme: theme
        }));
    }
}
