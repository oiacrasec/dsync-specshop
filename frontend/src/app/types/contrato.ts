// Contrato da API administrativa do Core (docs/api/admin-contracts.md): snake_case e public_id.

export interface Contract {
    public_id: string;
    name: string;
    plan: string | null;
    start_date: string;
    end_date: string | null;
    licenses: number;
    post_termination_retention_days: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ContractWrite {
    name: string;
    plan: string | null;
    start_date: string;
    end_date: string | null;
    licenses: number;
    post_termination_retention_days: number;
    is_active: boolean;
}

export interface ContractProvision {
    organization_name: string;
    username: string;
    name: string;
}

export interface ProvisionedOrganization {
    public_id: string;
    name: string;
}

export interface ProvisionedUser {
    public_id: string;
    username: string;
    name: string;
    is_superuser: boolean;
    must_change_password: boolean;
}

export interface ContractProvisionResult {
    organization: ProvisionedOrganization;
    user: ProvisionedUser;
    temporary_password: string;
}

export interface ContractAdmin {
    public_id: string;
    username: string;
    name: string;
    is_active: boolean;
    must_change_password: boolean;
}

export interface ContractAdminPasswordReset {
    user: ContractAdmin;
    temporary_password: string;
}
