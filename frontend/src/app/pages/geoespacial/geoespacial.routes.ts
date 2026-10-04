import { Routes } from '@angular/router';

import { accessGuard } from '@/app/core/guards/access.guard';
import { permissionGuard } from '@/app/core/guards/permission.guard';
import { ACCESS_AUDIENCE } from '@/app/core/tokens/access.types';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';

export default [
    {
        path: 'bancos',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/banco-geoespacial/banco-geoespacial').then((c) => c.BancoGeoespacialPage),
        data: {
            breadcrumb: 'Bancos geoespaciais',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.BANCO_VIEW
        }
    },
    {
        path: 'bancos/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () =>
            import('@/app/pages/geoespacial/banco-geoespacial/formulario/formulario').then((c) => c.BancoGeoespacialFormPage),
        data: {
            breadcrumb: 'Novo banco geoespacial',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.BANCO_CREATE
        }
    },
    {
        path: 'bancos/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () =>
            import('@/app/pages/geoespacial/banco-geoespacial/formulario/formulario').then((c) => c.BancoGeoespacialFormPage),
        data: {
            breadcrumb: 'Editar banco geoespacial',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.BANCO_UPDATE
        }
    },
    {
        path: 'geoservers',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/geoserver/geoserver').then((c) => c.GeoServerPage),
        data: {
            breadcrumb: 'GeoServers',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.GEOSERVER_VIEW
        }
    },
    {
        path: 'geoservers/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/geoserver/formulario/formulario').then((c) => c.GeoServerFormPage),
        data: {
            breadcrumb: 'Novo GeoServer',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.GEOSERVER_CREATE
        }
    },
    {
        path: 'geoservers/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/geoserver/formulario/formulario').then((c) => c.GeoServerFormPage),
        data: {
            breadcrumb: 'Editar GeoServer',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.GEOSERVER_UPDATE
        }
    },
    {
        path: 'geoserver-bancos',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/geoserver-banco/geoserver-banco').then((c) => c.GeoServerBancoPage),
        data: {
            breadcrumb: 'Vínculos GeoServer x Banco',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.GEOSERVER_VIEW
        }
    },
    {
        path: 'geoserver-bancos/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () =>
            import('@/app/pages/geoespacial/geoserver-banco/formulario/formulario').then((c) => c.GeoServerBancoFormPage),
        data: {
            breadcrumb: 'Novo vínculo GeoServer x Banco',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.GEOSERVER_CREATE
        }
    },
    {
        path: 'geoserver-bancos/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () =>
            import('@/app/pages/geoespacial/geoserver-banco/formulario/formulario').then((c) => c.GeoServerBancoFormPage),
        data: {
            breadcrumb: 'Editar vínculo GeoServer x Banco',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.GEOSERVER_UPDATE
        }
    },
    {
        path: 'workspaces',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/workspace/workspace').then((c) => c.WorkspacePage),
        data: {
            breadcrumb: 'Workspaces',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.WORKSPACE_VIEW
        }
    },
    {
        path: 'workspaces/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/workspace/formulario/formulario').then((c) => c.WorkspaceFormPage),
        data: {
            breadcrumb: 'Novo workspace',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.WORKSPACE_CREATE
        }
    },
    {
        path: 'workspaces/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/workspace/formulario/formulario').then((c) => c.WorkspaceFormPage),
        data: {
            breadcrumb: 'Editar workspace',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.WORKSPACE_UPDATE
        }
    },
    {
        path: 'stores',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/store/store').then((c) => c.StorePage),
        data: {
            breadcrumb: 'Stores',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.STORE_VIEW
        }
    },
    {
        path: 'stores/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/store/formulario/formulario').then((c) => c.StoreFormPage),
        data: {
            breadcrumb: 'Novo store',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.STORE_CREATE
        }
    },
    {
        path: 'stores/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/store/formulario/formulario').then((c) => c.StoreFormPage),
        data: {
            breadcrumb: 'Editar store',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.STORE_UPDATE
        }
    },
    {
        path: 'mapas',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/mapa/mapa').then((c) => c.MapaPage),
        data: {
            breadcrumb: 'Mapas',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.MAPA_VIEW
        }
    },
    {
        path: 'mapas/novo',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/mapa/formulario/formulario').then((c) => c.MapaFormPage),
        data: {
            breadcrumb: 'Novo mapa',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.MAPA_CREATE
        }
    },
    {
        path: 'mapas/:id/editor',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/mapa/editor/editor').then((c) => c.MapaEditorPage),
        data: {
            breadcrumb: 'Editor do mapa',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.MAPEDITOR_VIEW
        }
    },
    {
        path: 'mapas/:id',
        canActivate: [accessGuard, permissionGuard],
        loadComponent: () => import('@/app/pages/geoespacial/mapa/formulario/formulario').then((c) => c.MapaFormPage),
        data: {
            breadcrumb: 'Editar mapa',
            audience: ACCESS_AUDIENCE.COMMON,
            requireContext: true,
            requiredPermission: PERMISSION_KEYS.MAPA_UPDATE
        }
    }
] as Routes;
