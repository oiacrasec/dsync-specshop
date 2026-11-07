import { Routes } from '@angular/router';
import { accessGuard } from '@/app/core/guards/access.guard';
import { ACCESS_AUDIENCE } from '@/app/core/tokens/access.types';
import { permissionGuard } from '@/app/core/guards/permission.guard';
import { SPECSHOP_PERMISSION_KEYS } from '@/app/project/permission.keys';

export default [
    {
        path: 'produtos',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/pesquisa-precos/produtos/produtos').then((c) => c.ProdutosPage),
        data: {
            breadcrumb: 'Meus produtos',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: SPECSHOP_PERMISSION_KEYS.PRODUCT_VIEW
        }
    },
    {
        path: 'produtos/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/pesquisa-precos/produtos/formulario/formulario').then((c) => c.ProdutoFormPage),
        data: {
            breadcrumb: 'Novo produto',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: SPECSHOP_PERMISSION_KEYS.PRODUCT_CREATE
        }
    },
    {
        path: 'produtos/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/pesquisa-precos/produtos/formulario/formulario').then((c) => c.ProdutoFormPage),
        data: {
            breadcrumb: 'Editar produto',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: SPECSHOP_PERMISSION_KEYS.PRODUCT_UPDATE
        }
    }
] as Routes;
