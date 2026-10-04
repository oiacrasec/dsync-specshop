export type StoreTipo = 'POSTGIS';

export interface Store {
    id: number;
    contrato: number;
    contrato_id?: number;
    contrato_label?: string;
    workspace: number;
    workspace_id?: number;
    workspace_label?: string;
    geoserver?: number;
    geoserver_label?: string;
    banco_geoespacial: number;
    banco_geoespacial_id?: number;
    banco_geoespacial_label?: string;
    nome: string;
    tipo: StoreTipo;
    host: string;
    porta: number;
    banco: string;
    schema_name: string;
    usuario: string;
    senha_configurada?: boolean;
    ativo: boolean;
}

export interface StoreCreate {
    workspace: number;
    banco_geoespacial: number;
    nome: string;
    tipo: StoreTipo;
    schema_name: string;
    ativo?: boolean;
}

export type StoreUpdate = Partial<StoreCreate>;

export interface StoreEnsureSchemaPayload {
    store_id?: number;
    banco_geoespacial?: number;
    schema_name: string;
    create_if_missing?: boolean;
}

export interface StoreEnsureSchemaResponse {
    exists: boolean;
    created: boolean;
    requires_confirmation: boolean;
    schema_name: string;
    detail: string;
}
