import { PermissionScope } from '@/app/types/permission';

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

// GET/PUT /api/v1/users/{public_id}/access/ (docs/api/users.md, etapa 8.3).
export interface AccessGrant {
    scope: PermissionScope;
    organization: string | null;
    profile: string | null;
    permission: string;
    excluded_organizations: string[];
    is_active?: boolean;
}

export interface AccessOrganization {
    public_id: string;
    name: string;
    is_active: boolean;
}

export interface AccessProfile {
    public_id: string;
    name: string;
    is_active: boolean;
    is_system: boolean;
    is_essential: boolean;
    permissions: string[];
}

export interface UserAccessWrite {
    grants: AccessGrant[];
}

export interface UserAccess extends UserAccessWrite {
    organizations: AccessOrganization[];
    profiles: AccessProfile[];
}
