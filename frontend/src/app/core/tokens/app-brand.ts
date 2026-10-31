import { InjectionToken } from '@angular/core';

import { environment } from '@/environments/environment';

// Nome do sistema e da empresa nos textos; projetos derivados trocam no environment.
export interface AppBrand {
    name: string;
    company: string;
}

export const APP_BRAND = new InjectionToken<AppBrand>('APP_BRAND', {
    providedIn: 'root',
    factory: () => ({ name: environment.appName, company: environment.companyName })
});
