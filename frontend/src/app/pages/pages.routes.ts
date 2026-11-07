import { Routes } from '@angular/router';

import { PROJECT_ROUTES } from '@/app/project/project.routes';

export default [
    /* DESABILITADO: fora do escopo atual
    {
        path: 'documentation',
        loadComponent: () => import('@/app/pages/examples/documentation/documentation').then((c) => c.Documentation)
    },
    */
    {
        path: 'administracao',
        loadChildren: () => import('@/app/pages/administracao/administracao.routes'),
        data: { breadcrumb: 'Administração' }
    },
    /* DESABILITADO: fora do escopo atual
    {
        path: 'geoespacial',
        loadChildren: () => import('@/app/pages/geoespacial/geoespacial.routes'),
        data: { breadcrumb: 'Geoespacial' }
    },
    */
    /* DESABILITADO: fora do escopo atual
    { path: 'crud', loadComponent: () => import('@/app/pages/examples/crud/crud').then((c) => c.Crud), data: { breadcrumb: 'Crud' } },
    */
    /* DESABILITADO: fora do escopo atual
    { path: 'empty', loadComponent: () => import('@/app/pages/examples/empty/empty').then((c) => c.Empty), data: { breadcrumb: 'Empty' } },
    */
    /* DESABILITADO: fora do escopo atual
    {
        path: 'invoice',
        loadComponent: () => import('@/app/pages/examples/invoice/invoice').then((c) => c.Invoice),
        data: { breadcrumb: 'Invoice' }
    },
    */
    /* DESABILITADO: fora do escopo atual
    {
        path: 'aboutus',
        loadComponent: () => import('@/app/pages/examples/aboutus/aboutus').then((c) => c.AboutUs),
        data: { breadcrumb: 'About' }
    },
    */
    /* DESABILITADO: fora do escopo atual
    { path: 'help', loadComponent: () => import('@/app/pages/examples/help/help').then((c) => c.Help), data: { breadcrumb: 'Help' } },
    */
    /* DESABILITADO: fora do escopo atual
    { path: 'faq', loadComponent: () => import('@/app/pages/examples/faq/faq').then((c) => c.Faq), data: { breadcrumb: 'FAQ' } },
    */
    /* DESABILITADO: fora do escopo atual
    {
        path: 'contact',
        loadComponent: () => import('@/app/pages/examples/contactus/contactus').then((c) => c.ContactUs),
        data: { breadcrumb: 'Contact Us' }
    },
    */
    // Páginas do projeto derivado (project/project.routes.ts, ADR 0036 item 5).
    ...PROJECT_ROUTES,
    {
        path: 'error',
        redirectTo: '/notfound'
    },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
