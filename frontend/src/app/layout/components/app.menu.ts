import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppMenuitem } from './app.menuitem';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { PROJECT_MENU, ProjectMenuItem, ProjectMenuSection } from '@/app/project/project.menu';

@Component({
    selector: '[app-menu]',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track $index) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `
})
export class AppMenu implements OnInit {
    el: ElementRef = inject(ElementRef);
    private authSession = inject(AuthSessionService);
    private permissionContext = inject(PermissionContextService);

    @ViewChild('menuContainer') menuContainer!: ElementRef;

    model: any[] = [
        {
            label: 'Dashboards',
            icon: 'pi pi-home',
            path: '/dashboards',
            items: [
                {
                    label: 'Dashboards',
                    icon: 'pi pi-fw pi-chart-line',
                    routerLink: ['/dashboards']
                }
            ]
        },
        { separator: true },
        // Seções do projeto derivado (project/project.menu.ts, ADR 0036 item 5).
        ...PROJECT_MENU.flatMap((section) => [this.projectSection(section), { separator: true }]),
        {
            label: 'Administração',
            icon: 'pi pi-fw pi-briefcase',
            path: '/administracao',
            visible: () => this.canViewContratos() || this.canViewOrganizacoes() || this.canViewSetores() || this.canManageUsers() || this.canViewPerfis(),
            items: [
                {
                    label: 'Contratos',
                    icon: 'pi pi-fw pi-file',
                    visible: () => this.canViewContratos(),
                    routerLink: ['/pages/administracao/contrato']
                },
                {
                    label: 'Organizações',
                    icon: 'pi pi-fw pi-building',
                    visible: () => this.canViewOrganizacoes(),
                    routerLink: ['/pages/administracao/organizacao']
                },
                {
                    label: 'Usuários',
                    icon: 'pi pi-fw pi-users',
                    visible: () => this.canManageUsers(),
                    routerLink: ['/pages/administracao/usuario']
                },
                {
                    label: 'Perfis',
                    icon: 'pi pi-fw pi-id-card',
                    visible: () => this.canViewPerfis(),
                    routerLink: ['/pages/administracao/perfil']
                }
                /* DESABILITADO: fora do escopo atual
                {
                    label: 'Setores',
                    icon: 'pi pi-fw pi-sitemap',
                    visible: () => this.canViewSetores(),
                    routerLink: ['/pages/administracao/setor']
                },
                */
            ]
        }
        // DESABILITADO: separador do bloco Geoespacial
        // { separator: true },
        /* DESABILITADO: fora do escopo atual
        {
            label: 'Geoespacial',
            icon: 'pi pi-fw pi-map',
            path: '/geoespacial',
            visible: () =>
                this.canViewBancos() ||
                this.canViewGeoServers() ||
                this.canViewWorkspaces() ||
                this.canViewStores() ||
                this.canViewMapas(),
            items: [
                {
                    label: 'Bancos',
                    icon: 'pi pi-fw pi-database',
                    visible: () => this.canViewBancos(),
                    routerLink: ['/pages/geoespacial/bancos']
                },
                {
                    label: 'GeoServers',
                    icon: 'pi pi-fw pi-server',
                    visible: () => this.canViewGeoServers(),
                    routerLink: ['/pages/geoespacial/geoservers']
                },
                {
                    label: 'Workspaces',
                    icon: 'pi pi-fw pi-sitemap',
                    visible: () => this.canViewWorkspaces(),
                    routerLink: ['/pages/geoespacial/workspaces']
                },
                {
                    label: 'Stores',
                    icon: 'pi pi-fw pi-database',
                    visible: () => this.canViewStores(),
                    routerLink: ['/pages/geoespacial/stores']
                },
                {
                    label: 'Mapas',
                    icon: 'pi pi-fw pi-map-marker',
                    visible: () => this.canViewMapas(),
                    routerLink: ['/pages/geoespacial/mapas']
                }
            ]
        },
        */
        // DESABILITADO: separador do bloco User Management
        // { separator: true },
        /* DESABILITADO: fora do escopo atual
        {
            label: 'User Management',
            icon: 'pi pi-fw pi-user',
            path: '/profile',
            visible: false,
            items: [
                {
                    label: 'List',
                    icon: 'pi pi-fw pi-list',
                    routerLink: ['/profile/list']
                },
                {
                    label: 'Create',
                    icon: 'pi pi-fw pi-plus',
                    routerLink: ['/profile/create']
                }
            ]
        }
        */
    ];

    ngOnInit() {
        // Erros de contexto já são tratados pelo interceptor; o menu só fica sem os itens.
        this.permissionContext.loadForCurrentContext().subscribe({ error: () => undefined });
    }

    private isSuperuser() {
        return !!this.authSession.getUser()?.is_superuser;
    }

    private isCommonUser() {
        return !this.isSuperuser();
    }

    private canViewProjectItem(item: ProjectMenuItem) {
        return this.isCommonUser() && this.permissionContext.hasPermission(item.permission);
    }

    private projectSection(section: ProjectMenuSection) {
        return {
            label: section.label,
            icon: section.icon,
            path: section.path,
            visible: () => section.items.some((item) => this.canViewProjectItem(item)),
            items: section.items.map((item) => ({
                label: item.label,
                icon: item.icon,
                visible: () => this.canViewProjectItem(item),
                routerLink: item.routerLink
            }))
        };
    }

    private canViewContratos() {
        return this.isSuperuser();
    }

    private canViewOrganizacoes() {
        return this.isCommonUser() && this.permissionContext.hasPermission(PERMISSION_KEYS.ORGANIZATION_VIEW);
    }

    private canViewSetores() {
        return this.isCommonUser() && this.permissionContext.hasPermission(PERMISSION_KEYS.SETOR_VIEW);
    }

    private canManageUsers() {
        return this.isCommonUser() && this.permissionContext.hasPermission(PERMISSION_KEYS.USER_VIEW);
    }

    private canViewPerfis() {
        return this.isCommonUser() && this.permissionContext.hasPermission(PERMISSION_KEYS.PROFILE_VIEW);
    }

    private canViewBancos() {
        return this.isCommonUser() && this.permissionContext.hasPermission(PERMISSION_KEYS.BANCO_VIEW);
    }

    private canViewGeoServers() {
        return this.isCommonUser() && this.permissionContext.hasPermission(PERMISSION_KEYS.GEOSERVER_VIEW);
    }

    private canViewWorkspaces() {
        return this.isCommonUser() && this.permissionContext.hasPermission(PERMISSION_KEYS.WORKSPACE_VIEW);
    }

    private canViewStores() {
        return this.isCommonUser() && this.permissionContext.hasPermission(PERMISSION_KEYS.STORE_VIEW);
    }

    private canViewMapas() {
        return this.isCommonUser() && this.permissionContext.hasPermission(PERMISSION_KEYS.MAPA_VIEW);
    }
}
