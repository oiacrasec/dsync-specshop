import { Routes } from '@angular/router';

/**
 * Rotas das páginas do projeto derivado (ADR 0036, item 5): arquivo do projeto, vazio no core.
 *
 * Entram em `/pages/` antes da rota coringa. O core nunca altera este arquivo e, em conflito
 * de merge, vale a versão do projeto.
 */
export const PROJECT_ROUTES: Routes = [
    {
        path: 'pesquisa-precos',
        loadChildren: () => import('@/app/pages/pesquisa-precos/pesquisa-precos.routes'),
        data: { breadcrumb: 'Pesquisa de preços' }
    }
];
