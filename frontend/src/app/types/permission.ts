// Resposta de GET /api/v1/me/permissions/ (ADR 0037): só para a interface; o backend autoriza.
export interface PermissionSummary {
    permissions: string[];
}

// GET /api/v1/permissions/: catálogo do registry com rótulos, por recurso.
export interface PermissionCatalogItem {
    code: string;
    action: string;
    label: string;
    scopes: Array<'CONTRACT' | 'ORGANIZATION'>;
    reserved: boolean;
}

export interface PermissionCatalogGroup {
    resource: string;
    label: string;
    permissions: PermissionCatalogItem[];
}
