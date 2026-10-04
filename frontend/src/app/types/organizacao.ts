export interface Organizacao {
    id: number;
    contrato: number;
    contrato_id?: number;
    contrato_label?: string;
    nome: string;
    cnpj: string | null;
    inscricao_estadual: string | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    complemento: string | null;
    cep: string | null;
    cidade: number | null;
    cidade_id?: number | null;
    cidade_label?: string | null;
    ativo: boolean;
}

export interface OrganizacaoCreate {
    nome: string;
    cnpj?: string | null;
    inscricao_estadual?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    complemento?: string | null;
    cep?: string | null;
    cidade?: number | null;
    ativo?: boolean;
}

export type OrganizacaoUpdate = Partial<OrganizacaoCreate>;
