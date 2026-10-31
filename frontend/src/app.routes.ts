import { Routes } from '@angular/router';
import { AppLayout } from '@/app/layout/components/app.layout';
import { LandingLayout } from '@/app/layout/components/app.landinglayout';
import { AuthLayout } from '@/app/layout/components/app.authlayout';
import { Notfound } from '@/app/pages/examples/notfound/notfound';
import { accessGuard } from '@/app/core/guards/access.guard';
import { ACCESS_AUDIENCE } from '@/app/core/tokens/access.types';

export const appRoutes: Routes = [
    {
        path: 'contexto/selecao',
        component: AuthLayout,
        canActivate: [accessGuard],
        data: { audience: ACCESS_AUDIENCE.COMMON, requireContext: false },
        children: [{ path: '', loadComponent: () => import('@/app/pages/auth/contexto-selecao').then((c) => c.ContextoSelecaoPage) }]
    },
    {
        path: '',
        component: AppLayout,
        canActivate: [accessGuard],
        data: {
            audience: ACCESS_AUDIENCE.AUTHENTICATED,
            requireContext: true
        },
        children: [
            {
                path: '',
                redirectTo: 'dashboards',
                pathMatch: 'full'
            },
            {
                path: 'primeiro-acesso/trocar-senha',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/auth/primeiro-acesso-trocar-senha').then((c) => c.PrimeiroAcessoTrocarSenhaPage),
                data: {
                    breadcrumb: 'Primeiro acesso',
                    audience: ACCESS_AUDIENCE.COMMON,
                    requireContext: false
                }
            },
            {
                path: 'dashboards',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/dashboards/dashboards').then((c) => c.DashboardsPage),
                data: {
                    breadcrumb: 'Dashboards',
                    audience: ACCESS_AUDIENCE.AUTHENTICATED
                }
            },
            /* DESABILITADO: fora do escopo atual
            {
                path: 'dashboard-marketing',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/examples/dashboards/examples/marketing/marketingdashboard').then((c) => c.MarketingDashboard),
                data: {
                    breadcrumb: 'Marketing Dashboard',
                    audience: ACCESS_AUDIENCE.COMMON
                }
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'dashboard-ecommerce',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/examples/dashboards/examples/ecommerce/ecommercedashboard').then((c) => c.EcommerceDashboard),
                data: {
                    breadcrumb: 'E-Commerce Dashboard',
                    audience: ACCESS_AUDIENCE.COMMON
                }
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'dashboard-banking',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/examples/dashboards/examples/banking/bankingdashboard').then((c) => c.BankingDashboard),
                data: {
                    breadcrumb: 'Banking Dashboard',
                    audience: ACCESS_AUDIENCE.COMMON
                }
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'uikit',
                canActivate: [accessGuard],
                data: { breadcrumb: 'UI Kit' },
                loadChildren: () => import('@/app/pages/examples/uikit/uikit.routes')
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'documentation',
                canActivate: [accessGuard],
                data: { breadcrumb: 'Documentation' },
                loadComponent: () => import('@/app/pages/examples/documentation/documentation').then((c) => c.Documentation)
            },
            */
            {
                path: 'perfil',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/perfil/perfil').then((c) => c.PerfilPage),
                data: {
                    breadcrumb: 'Perfil',
                    audience: ACCESS_AUDIENCE.AUTHENTICATED
                }
            },
            {
                path: 'configuracoes',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/configuracoes/configuracoes').then((c) => c.ConfiguracoesPage),
                data: {
                    breadcrumb: 'Configurações',
                    audience: ACCESS_AUDIENCE.AUTHENTICATED
                }
            },
            {
                path: 'documentacoes',
                canActivate: [accessGuard],
                loadChildren: () => import('@/app/pages/documentacoes/documentacoes.routes'),
                data: {
                    breadcrumb: 'Documentações',
                    audience: ACCESS_AUDIENCE.AUTHENTICATED
                }
            },
            {
                path: 'pages',
                canActivate: [accessGuard],
                loadChildren: () => import('@/app/pages/pages.routes'),
                data: { breadcrumb: 'Páginas', breadcrumbHidden: true }
            }
            /* DESABILITADO: fora do escopo atual
            {
                path: 'apps',
                canActivate: [accessGuard],
                loadChildren: () => import('@/app/pages/examples/apps.routes'),
                data: { breadcrumb: 'Apps' }
            },
            */

            /* DESABILITADO: fora do escopo atual
            {
                path: 'blocks',
                canActivate: [accessGuard],
                data: { breadcrumb: 'Free Blocks' },
                loadChildren: () => import('@/app/pages/examples/blocks/blocks.routes')
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'ecommerce',
                canActivate: [accessGuard],
                loadChildren: () => import('@/app/pages/examples/ecommerce/ecommerce.routes'),
                data: { breadcrumb: 'E-Commerce' }
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'profile',
                canActivate: [accessGuard],
                loadChildren: () => import('@/app/pages/examples/usermanagement/usermanagement.routes'),
                data: { breadcrumb: 'User Management' }
            }
            */
        ]
    },
    {
        path: 'landing',
        component: LandingLayout,
        children: [
            { path: '', redirectTo: 'login', pathMatch: 'full' },
            /* DESABILITADO: fora do escopo atual
            {
                path: '',
                loadComponent: () => import('@/app/pages/examples/landing').then((c) => c.Landing)
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'about',
                loadComponent: () => import('@/app/pages/examples/landing/about').then((c) => c.About)
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'pricing',
                loadComponent: () => import('@/app/pages/examples/landing/pricing').then((c) => c.Pricing)
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'contact',
                loadComponent: () => import('@/app/pages/examples/landing/contact').then((c) => c.Contact)
            },
            */
            {
                path: 'login',
                loadComponent: () => import('@/app/pages/auth/login').then((c) => c.Login)
            },
            /* DESABILITADO: fora do escopo atual
            {
                path: 'register',
                loadComponent: () => import('@/app/pages/auth/register').then((c) => c.Register)
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'verification',
                loadComponent: () => import('@/app/pages/auth/verification').then((c) => c.Verification)
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'forgot-password',
                loadComponent: () => import('@/app/pages/auth/forgotpassword').then((c) => c.ForgotPassword)
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'new-password',
                loadComponent: () => import('@/app/pages/auth/newpassword').then((c) => c.NewPassword)
            },
            */
            /* DESABILITADO: fora do escopo atual
            {
                path: 'lock-screen',
                loadComponent: () => import('@/app/pages/auth/lockscreen').then((c) => c.LockScreen)
            },
            */
            {
                path: 'oops',
                loadComponent: () => import('@/app/pages/examples/oops/oops').then((c) => c.Oops)
            },
            {
                path: 'access',
                loadComponent: () => import('@/app/pages/auth/access').then((c) => c.Access)
            },
            {
                path: 'error',
                redirectTo: '/notfound'
            }
        ]
    },
    { path: 'notfound', component: Notfound },
    {
        path: 'auth',
        component: AuthLayout,
        children: []
    },
    { path: '**', redirectTo: '/notfound' }
];
