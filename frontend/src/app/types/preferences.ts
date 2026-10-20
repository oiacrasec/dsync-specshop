import { MenuMode } from '@/app/layout/service/layout.service';

// GET/PUT /api/v1/me/preferences/ (docs/api/preferences.md): aparência da interface do usuário.
export interface UserPreferences {
    preset: 'Aura' | 'Lara' | 'Nora';
    primary: string;
    dark_mode: boolean;
    menu_mode: MenuMode;
}

export const DEFAULT_PREFERENCES: UserPreferences = { preset: 'Aura', primary: 'blue', dark_mode: false, menu_mode: 'static' };
