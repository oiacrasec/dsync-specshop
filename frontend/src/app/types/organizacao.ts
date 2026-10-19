// Organização da área do cliente (docs/api/organizations.md): snake_case e public_id.
export interface Organization {
    public_id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface OrganizationWrite {
    name: string;
    is_active: boolean;
}
