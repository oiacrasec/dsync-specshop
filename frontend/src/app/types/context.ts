export interface UserContextSetor {
    id: number;
    nome: string;
    perfil: 'ADMINISTRADOR' | 'EDITOR' | 'PESQUISADOR';
}

export interface UserContextOrganizacao {
    id: number;
    nome: string;
    setores: UserContextSetor[];
}

export interface UserContextsResponse {
    is_superuser: boolean;
    contrato: {
        id: number;
        nome: string;
    } | null;
    organizacoes: UserContextOrganizacao[];
}

export interface ActiveUserContext {
    contrato_id: number;
    contrato_nome: string;
    organizacao_id: number;
    organizacao_nome: string;
}
