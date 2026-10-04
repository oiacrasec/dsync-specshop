export interface Setor {
    id: number;
    organizacao: number;
    organizacao_id?: number;
    organizacao_label?: string;
    nome: string;
    ativo: boolean;
}

export interface SetorCreate {
    nome: string;
    ativo?: boolean;
}

export type SetorUpdate = Partial<SetorCreate>;
