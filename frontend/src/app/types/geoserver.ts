export type GeoServerStatus = 'ACTIVE' | 'DRAINING' | 'MAINTENANCE' | 'OFFLINE';

export interface GeoServer {
    id: number;
    contrato: number;
    contrato_id?: number;
    contrato_label?: string;
    nome: string;
    base_url: string;
    admin_user: string;
    status: GeoServerStatus;
    prioridade: number;
    limite_workspaces: number | null;
    observacoes: string | null;
    admin_password_configurada?: boolean;
    ativo: boolean;
}

export interface GeoServerCreate {
    nome: string;
    base_url: string;
    admin_user: string;
    admin_password?: string;
    status?: GeoServerStatus;
    prioridade?: number;
    limite_workspaces?: number | null;
    observacoes?: string | null;
    ativo?: boolean;
}

export type GeoServerUpdate = Partial<GeoServerCreate>;

export interface GeoServerTestConnectionPayload {
    geoserver_id?: number;
    base_url?: string;
    admin_user?: string;
    admin_password?: string;
}
