export interface GeoServerBanco {
    id: number;
    contrato: number;
    contrato_id?: number;
    contrato_label?: string;
    geoserver: number;
    geoserver_id?: number;
    geoserver_label?: string;
    banco: number;
    banco_id?: number;
    banco_label?: string;
    ativo: boolean;
}

export interface GeoServerBancoCreate {
    geoserver: number;
    banco: number;
    ativo?: boolean;
}

export type GeoServerBancoUpdate = Partial<GeoServerBancoCreate>;
