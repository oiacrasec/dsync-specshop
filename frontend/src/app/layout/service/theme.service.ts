import { computed, inject, Injectable, signal } from '@angular/core';
import { $t } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { LayoutService, MenuMode } from '@/app/layout/service/layout.service';
import { UserPreferences } from '@/app/types/preferences';

export type PresetName = 'Aura' | 'Lara' | 'Nora';

export const PRESET_NAMES: PresetName[] = ['Aura', 'Lara', 'Nora'];
export const PRIMARY_COLOR_NAMES = ['noir', 'emerald', 'green', 'lime', 'orange', 'amber', 'yellow', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

// Aura é o tema do app e entra no bundle inicial; Lara e Nora só carregam se escolhidos (etapa 6.2a).
const PRESET_LOADERS: Record<Exclude<PresetName, 'Aura'>, () => Promise<any>> = {
    Lara: () => import('@primeuix/themes/lara').then((module) => module.default),
    Nora: () => import('@primeuix/themes/nora').then((module) => module.default)
};

declare type KeyOfType<T> = keyof T extends infer U ? U : never;

export declare type SurfacesType = {
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

// Aplica a aparência (preset, cor primária, modo e menu) no PrimeNG e no layout. Extraído do
// antigo painel de configuração para a tela de Configurações e para a carga das preferências.
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private layoutService = inject(LayoutService);
    private loadedPresets = signal<Partial<Record<PresetName, any>>>({ Aura });

    readonly primaryColors = computed<SurfacesType[]>(() => {
        const preset = this.loadedPresets()[this.layoutService.layoutConfig().preset as PresetName] ?? Aura;
        const presetPalette = preset.primitive;

        return PRIMARY_COLOR_NAMES.map((name) => ({ name, palette: name === 'noir' ? {} : (presetPalette?.[name as KeyOfType<typeof presetPalette>] as SurfacesType['palette']) }));
    });

    current(): UserPreferences {
        const config = this.layoutService.layoutConfig();

        return { preset: config.preset as PresetName, primary: config.primary, dark_mode: config.darkTheme, menu_mode: config.menuMode };
    }

    async apply(preferences: UserPreferences) {
        const preset = await this.loadPreset(preferences.preset);

        this.layoutService.layoutConfig.update((state) => ({ ...state, preset: preferences.preset, primary: preferences.primary, darkTheme: preferences.dark_mode }));
        this.layoutService.toggleDarkMode();
        this.setMenuMode(preferences.menu_mode);
        $t().preset(preset).preset(this.getPresetExt()).use({ useDefaultOptions: true });
        this.layoutService.updateBodyBackground(preferences.primary);
    }

    private setMenuMode(mode: MenuMode) {
        if (this.layoutService.layoutConfig().menuMode !== mode) {
            this.layoutService.changeMenuMode(mode);
        }
    }

    private async loadPreset(name: PresetName) {
        const loaded = this.loadedPresets()[name];

        if (loaded) {
            return loaded;
        }

        const preset = await PRESET_LOADERS[name as Exclude<PresetName, 'Aura'>]();

        this.loadedPresets.update((current) => ({ ...current, [name]: preset }));

        return preset;
    }

    private getPresetExt() {
        const color: SurfacesType = this.primaryColors().find((c) => c.name === this.layoutService.layoutConfig().primary) || {};

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
}
