// Resposta de GET /api/v1/me/permissions/ (ADR 0037): só para a interface; o backend autoriza.
export interface PermissionSummary {
    permissions: string[];
}

export type PermissionScope = 'CONTRACT' | 'ORGANIZATION';

// GET /api/v1/permissions/: catálogo do registry com rótulos, por recurso.
export interface PermissionCatalogItem {
    code: string;
    action: string;
    label: string;
    scopes: PermissionScope[];
    reserved: boolean;
}

export interface PermissionCatalogGroup {
    resource: string;
    label: string;
    permissions: PermissionCatalogItem[];
}
