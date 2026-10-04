import { Routes } from '@angular/router';
import { AppLayout } from '@/app/layout/components/app.layout';
import { LandingLayout } from '@/app/layout/components/app.landinglayout';
import { AuthLayout } from '@/app/layout/components/app.authlayout';
import { Notfound } from '@/app/pages/examples/notfound/notfound';
import { accessGuard } from '@/app/core/guards/access.guard';
import { ACCESS_AUDIENCE } from '@/app/core/tokens/access.types';

export const appRoutes: Routes = [
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
                redirectTo: 'kpi',
                pathMatch: 'full'
            },
            {
                path: 'contexto/selecao',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/auth/contexto-selecao').then((c) => c.ContextoSelecaoPage),
                data: {
                    breadcrumb: 'Selecionar organização',
                    audience: ACCESS_AUDIENCE.COMMON,
                    requireContext: false,
                    hideBreadcrumbBar: true
                }
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
                path: 'kpi',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/examples/dashboards/kpi/kpidashboard').then((c) => c.KpiDashboard),
                data: {
                    breadcrumb: 'KPI',
                    audience: ACCESS_AUDIENCE.AUTHENTICATED
                }
            },
            {
                path: 'dashboard-marketing',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/examples/dashboards/examples/marketing/marketingdashboard').then((c) => c.MarketingDashboard),
                data: {
                    breadcrumb: 'Marketing Dashboard',
                    audience: ACCESS_AUDIENCE.COMMON
                }
            },
            {
                path: 'dashboard-ecommerce',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/examples/dashboards/examples/ecommerce/ecommercedashboard').then((c) => c.EcommerceDashboard),
                data: {
                    breadcrumb: 'E-Commerce Dashboard',
                    audience: ACCESS_AUDIENCE.COMMON
                }
            },
            {
                path: 'dashboard-banking',
                canActivate: [accessGuard],
                loadComponent: () => import('@/app/pages/examples/dashboards/examples/banking/bankingdashboard').then((c) => c.BankingDashboard),
                data: {
                    breadcrumb: 'Banking Dashboard',
                    audience: ACCESS_AUDIENCE.COMMON
                }
            },
            {
                path: 'uikit',
                canActivate: [accessGuard],
                data: { breadcrumb: 'UI Kit' },
                loadChildren: () => import('@/app/pages/examples/uikit/uikit.routes')
            },
            {
                path: 'documentation',
                canActivate: [accessGuard],
                data: { breadcrumb: 'Documentation' },
                loadComponent: () => import('@/app/pages/examples/documentation/documentation').then((c) => c.Documentation)
            },
            {
                path: 'pages',
                canActivate: [accessGuard],
                loadChildren: () => import('@/app/pages/pages.routes'),
                data: { breadcrumb: 'Páginas', breadcrumbHidden: true }
            },
            {
                path: 'apps',
                canActivate: [accessGuard],
                loadChildren: () => import('@/app/pages/examples/apps.routes'),
                data: { breadcrumb: 'Apps' }
            },

            {
                path: 'blocks',
                canActivate: [accessGuard],
                data: { breadcrumb: 'Free Blocks' },
                loadChildren: () => import('@/app/pages/examples/blocks/blocks.routes')
            },
            {
                path: 'ecommerce',
                canActivate: [accessGuard],
                loadChildren: () => import('@/app/pages/examples/ecommerce/ecommerce.routes'),
                data: { breadcrumb: 'E-Commerce' }
            },
            {
                path: 'profile',
                canActivate: [accessGuard],
                loadChildren: () => import('@/app/pages/examples/usermanagement/usermanagement.routes'),
                data: { breadcrumb: 'User Management' }
            }
        ]
    },
    {
        path: 'landing',
        component: LandingLayout,
        children: [
            {
                path: '',
                loadComponent: () => import('@/app/pages/examples/landing').then((c) => c.Landing)
            },
            {
                path: 'about',
                loadComponent: () => import('@/app/pages/examples/landing/about').then((c) => c.About)
            },
            {
                path: 'pricing',
                loadComponent: () => import('@/app/pages/examples/landing/pricing').then((c) => c.Pricing)
            },
            {
                path: 'contact',
                loadComponent: () => import('@/app/pages/examples/landing/contact').then((c) => c.Contact)
            },
            {
                path: 'login',
                loadComponent: () => import('@/app/pages/auth/login').then((c) => c.Login)
            },
            {
                path: 'register',
                loadComponent: () => import('@/app/pages/auth/register').then((c) => c.Register)
            },
            {
                path: 'verification',
                loadComponent: () => import('@/app/pages/auth/verification').then((c) => c.Verification)
            },
            {
                path: 'forgot-password',
                loadComponent: () => import('@/app/pages/auth/forgotpassword').then((c) => c.ForgotPassword)
            },
            {
                path: 'new-password',
                loadComponent: () => import('@/app/pages/auth/newpassword').then((c) => c.NewPassword)
            },
            {
                path: 'lock-screen',
                loadComponent: () => import('@/app/pages/auth/lockscreen').then((c) => c.LockScreen)
            },
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
