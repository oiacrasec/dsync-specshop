export interface BancoGeoespacial {
    id: number;
    contrato: number;
    contrato_id?: number;
    contrato_label?: string;
    nome: string;
    host: string;
    porta: number;
    database_name: string;
    usuario: string;
    observacoes: string | null;
    senha_configurada?: boolean;
    ativo: boolean;
}

export interface BancoGeoespacialCreate {
    nome: string;
    host: string;
    porta?: number;
    database_name: string;
    usuario: string;
    senha?: string;
    observacoes?: string | null;
    ativo?: boolean;
}

export type BancoGeoespacialUpdate = Partial<BancoGeoespacialCreate>;

export interface BancoGeoespacialTestConnectionPayload {
    banco_id?: number;
    host?: string;
    porta?: number;
    database_name?: string;
    usuario?: string;
    senha?: string;
}
