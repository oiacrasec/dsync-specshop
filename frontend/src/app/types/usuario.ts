import { UserAccessStatus, UserType } from '@/app/types/auth';

export interface UsuarioOrganizacaoResumo {
    id: number;
    nome: string;
}

export interface UsuarioPermissaoOrganizacao {
    organizacao_id: number;
    permissoes: string[];
}

export interface UsuarioPermissaoCatalogoItem {
    resource: string;
    label: string;
    permissions: {
        key: string;
        action: string;
        label: string;
        description: string;
    }[];
}

export interface UsuarioPermissaoPreset {
    code: string;
    label: string;
    description: string;
    permissions: string[];
}

export interface Usuario {
    id: number;
    uuid: string;
    username: string;
    email: string;
    nome: string;
    sobrenome: string;
    nome_completo: string;
    user_type: UserType;
    status_acesso: UserAccessStatus;
    must_change_password: boolean;
    last_access_at: string | null;
    organizacoes: UsuarioOrganizacaoResumo[];
    senha_temporaria?: string | null;
}

export interface UsuarioConfiguracao {
    id: number;
    username: string;
    email: string;
    nome: string;
    sobrenome: string;
    organizacoes: UsuarioOrganizacaoResumo[];
    contrato_admin: boolean;
    permissoes_organizacoes: UsuarioPermissaoOrganizacao[];
    catalogo_permissoes: UsuarioPermissaoCatalogoItem[];
    presets: UsuarioPermissaoPreset[];
}

export interface UsuarioCreate {
    username: string;
    email: string;
    nome: string;
    sobrenome: string;
    organizacao_ids: number[];
    preset_padrao?: string;
}

export interface UsuarioUpdate {
    username?: string;
    email?: string;
    nome?: string;
    sobrenome?: string;
}

export interface UsuarioConfiguracaoUpdate {
    username: string;
    email: string;
    nome: string;
    sobrenome: string;
    contrato_admin: boolean;
    permissoes_organizacoes: UsuarioPermissaoOrganizacao[];
}
