import { Routes } from '@angular/router';
import { accessGuard } from '@/app/core/guards/access.guard';
import { ACCESS_AUDIENCE } from '@/app/core/tokens/access.types';
import { permissionGuard } from '@/app/core/guards/permission.guard';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';

export default [
    {
        path: 'contrato',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/administracao/contrato/contrato').then((c) => c.ContratoPage),
        data: {
            breadcrumb: 'Contratos',
            audience: ACCESS_AUDIENCE.ADMIN,
            requireContext: false,
            requiredPermission: PERMISSION_KEYS.CONTRATO_VIEW
        }
    },
    {
        path: 'contrato/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/administracao/contrato/formulario/formulario').then((c) => c.ContratoFormPage),
        data: {
            breadcrumb: 'Novo contrato',
            audience: ACCESS_AUDIENCE.ADMIN,
            requireContext: false,
            requiredPermission: PERMISSION_KEYS.CONTRATO_UPDATE
        }
    },
    {
        path: 'contrato/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/administracao/contrato/formulario/formulario').then((c) => c.ContratoFormPage),
        data: {
            breadcrumb: 'Editar contrato',
            audience: ACCESS_AUDIENCE.ADMIN,
            requireContext: false,
            requiredPermission: PERMISSION_KEYS.CONTRATO_UPDATE
        }
    },
    {
        path: 'organizacao',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/administracao/organizacao/organizacao').then((c) => c.OrganizacaoPage),
        data: {
            breadcrumb: 'Organizações',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.ORGANIZATION_VIEW
        }
    },
    {
        path: 'organizacao/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/administracao/organizacao/formulario/formulario').then((c) => c.OrganizacaoFormPage),
        data: {
            breadcrumb: 'Nova organização',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.ORGANIZATION_CREATE
        }
    },
    {
        path: 'organizacao/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/administracao/organizacao/formulario/formulario').then((c) => c.OrganizacaoFormPage),
        data: {
            breadcrumb: 'Editar organização',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.ORGANIZATION_UPDATE
        }
    },
    {
        path: 'usuario',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/administracao/usuario/usuario').then((c) => c.UsuarioPage),
        data: {
            breadcrumb: 'Usuários',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.USER_VIEW
        }
    },
    {
        path: 'usuario/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/administracao/usuario/formulario/formulario').then((c) => c.UsuarioFormPage),
        data: {
            breadcrumb: 'Novo usuário',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.USER_CREATE
        }
    },
    {
        path: 'usuario/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/administracao/usuario/formulario/formulario').then((c) => c.UsuarioFormPage),
        data: {
            breadcrumb: 'Editar usuário',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.USER_UPDATE
        }
    }
] as Routes;
