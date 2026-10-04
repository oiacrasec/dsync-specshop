export interface Contrato {
    id: number;
    nome: string;
    data_inicio: string;
    data_fim: string | null;
    licencas: number;
    ativo: boolean;
}

export interface ContratoCreate {
    nome: string;
    data_inicio?: string;
    data_fim?: string | null;
    licencas?: number;
    ativo?: boolean;
}

export type ContratoUpdate = Partial<ContratoCreate>;

export interface ContratoProvisionamentoInicialCreate {
    organizacao_nome: string;
    usuario_nome: string;
    usuario_sobrenome: string;
    usuario_username: string;
    usuario_email: string;
}

export interface ContratoProvisionamentoInicialResult {
    contrato_id: number;
    organizacao: {
        id: number;
        nome: string;
    };
    usuario: {
        id: number;
        username: string;
        email: string;
        nome: string;
        sobrenome: string;
    };
    senha_temporaria: string;
}

export interface ContratoAdministrador {
    id: number;
    username: string;
}

export interface ContratoAdministradoresResponse {
    total: number;
    data: ContratoAdministrador[];
}

export interface ContratoAdministradorResetSenhaResult {
    usuario: {
        id: number;
        username: string;
    };
    senha_temporaria: string;
}
