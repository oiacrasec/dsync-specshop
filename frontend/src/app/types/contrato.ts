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

export interface ContractListResponse {
    data: Contract[];
    total_records: number;
}

export interface SchemaColumn {
    field: string;
    label: string;
}

export interface SchemaFilter {
    field: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'choice' | 'date' | 'datetime' | 'relation';
    options_url?: string | null;
    choices?: Array<{ value: unknown; label: string }>;
}

export interface GeneralSearchSchema {
    parameter: string;
    label: string;
    fields: Array<{ field: string; label: string; lookup: string }>;
}

export interface TableSchema {
    columns: SchemaColumn[];
    filters: SchemaFilter[];
    general_search: GeneralSearchSchema | null;
    ordering_fields: string[];
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

export interface ContractAdminsResponse {
    data: ContractAdmin[];
    total_records: number;
}

export interface ContractAdminPasswordReset {
    user: ContractAdmin;
    temporary_password: string;
}
