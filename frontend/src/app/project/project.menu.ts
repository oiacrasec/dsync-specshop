import { SPECSHOP_PERMISSION_KEYS } from './permission.keys';

/**
 * Menu do projeto derivado (ADR 0036, item 5): arquivo do projeto, vazio no core.
 *
 * Cada seção entra no menu lateral entre Dashboards e Administração. Um item só aparece para
 * usuário comum com a permissão declarada (código do registry do backend); a seção some quando
 * nenhum item dela está visível. O core nunca altera este arquivo e, em conflito de merge,
 * vale a versão do projeto.
 */
export interface ProjectMenuItem {
    label: string;
    icon: string;
    permission: string;
    routerLink: string[];
}

export interface ProjectMenuSection {
    label: string;
    icon: string;
    path: string;
    items: ProjectMenuItem[];
}

export const PROJECT_MENU: ProjectMenuSection[] = [
    {
        label: 'Pesquisa de preços',
        icon: 'pi pi-fw pi-search',
        path: '/pesquisa-precos',
        items: [
            {
                label: 'Meus produtos',
                icon: 'pi pi-fw pi-briefcase',
                permission: SPECSHOP_PERMISSION_KEYS.PRODUCT_VIEW,
                routerLink: ['/pages/pesquisa-precos/produtos']
            }
        ]
    }
];
