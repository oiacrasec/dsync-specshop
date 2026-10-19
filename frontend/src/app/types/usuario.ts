// Usuários do contrato na área do cliente (docs/api/users.md): snake_case e public_id.
export interface ContractUser {
    public_id: string;
    username: string;
    name: string;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
    updated_at: string;
}

export interface ContractUserWrite {
    username: string;
    name: string;
    is_active: boolean;
}

export interface ContractUserCreated extends ContractUser {
    temporary_password: string;
}

export interface ContractUserPasswordReset {
    user: ContractUser;
    temporary_password: string;
}
