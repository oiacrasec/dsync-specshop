export type MapaVisibilidade = 'INDIVIDUAL' | 'SETOR' | 'ORGANIZACAO' | 'COMPARTILHADO';

export interface MapaSetorCompartilhadoResumo {
    id: number;
    nome: string;
}

export interface Mapa {
    id: number;
    contrato: number;
    contrato_id?: number;
    contrato_label?: string;
    organizacao: number;
    organizacao_id?: number;
    organizacao_label?: string;
    setor: number | null;
    setor_id?: number;
    setor_label?: string;
    store: number | null;
    store_id?: number;
    store_label?: string;
    criado_por: number;
    criado_por_id?: number;
    criado_por_label?: string;
    nome: string;
    srid: number;
    visibilidade: MapaVisibilidade;
    ativo: boolean;
    setores_compartilhados: MapaSetorCompartilhadoResumo[];
}

export type MapaLayerStatus = 'PROVISIONING' | 'ACTIVE' | 'ERROR';

export interface MapaLayerColumn {
    name: string;
    type: string;
    size?: number;
    precision?: number;
    scale?: number;
    nullable?: boolean;
    default?: any;
    unique?: boolean;
}

export interface MapaLayer {
    id: number;
    mapa: number;
    nome: string;
    datastore_name: string;
    workspace: string;
    layer_name: string;
    schema_name: string;
    table_name: string;
    geom_type: string;
    columns_metadata: MapaLayerColumn[];
    estilo: string;
    ordem: number;
    visivel: boolean;
    status: MapaLayerStatus;
    synced_at: string | null;
    last_error: string;
    ativo: boolean;
}

export interface MapaCreate {
    nome: string;
    store: number;
    setor?: number | null;
    srid: number;
    visibilidade: MapaVisibilidade;
    ativo?: boolean;
    setor_compartilhado_ids?: number[];
}

export type MapaUpdate = Partial<MapaCreate>;

export interface MapaLayerCreate {
    nome: string;
    geom_type: string;
    columns?: MapaLayerColumn[];
    style_name?: string | null;
    ordem?: number;
    visivel?: boolean;
}

export interface MapaLayerUpdate {
    nome?: string;
    ordem?: number;
    visivel?: boolean;
    style_name?: string | null;
}

export interface MapaLayerFeature {
    id: number;
    geometry: Record<string, any> | null;
    attributes: Record<string, any>;
}

export interface MapaLayerFeatureListResponse {
    data: MapaLayerFeature[];
    totalRecords: number;
    first: number;
    rows: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

export interface MapaLayerFeatureListQuery {
    first?: number;
    rows?: number;
    bbox?: string;
}

export interface MapaLayerFeatureCreatePayload {
    geometry: Record<string, any>;
    attributes?: Record<string, any>;
}

export interface MapaLayerFeatureUpdatePayload {
    geometry?: Record<string, any>;
    attributes?: Record<string, any>;
}
