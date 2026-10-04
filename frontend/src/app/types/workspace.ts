export interface Workspace {
    id: number;
    contrato: number;
    contrato_id?: number;
    contrato_label?: string;
    geoserver: number;
    geoserver_id?: number;
    geoserver_label?: string;
    nome: string;
    observacoes: string | null;
    ativo: boolean;
}

export interface WorkspaceCreate {
    geoserver: number;
    nome: string;
    observacoes?: string | null;
    ativo?: boolean;
}

export type WorkspaceUpdate = Partial<WorkspaceCreate>;
