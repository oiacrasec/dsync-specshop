import { Routes } from '@angular/router';

import { accessGuard } from '@/app/core/guards/access.guard';
import { ACCESS_AUDIENCE } from '@/app/core/tokens/access.types';

export default [
    {
        path: '',
        canActivate: [accessGuard],
        loadComponent: () => import('@/app/pages/documentacoes/documentacoes').then((c) => c.DocumentacoesPage),
        data: { audience: ACCESS_AUDIENCE.AUTHENTICATED }
    },
    {
        path: 'api',
        canActivate: [accessGuard],
        loadComponent: () => import('@/app/pages/documentacoes/api/api').then((c) => c.DocumentacaoApiPage),
        data: { breadcrumb: 'API', audience: ACCESS_AUDIENCE.AUTHENTICATED }
    }
] as Routes;
