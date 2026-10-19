// Perfis da área do cliente (docs/api/profiles.md).
export interface Profile {
    public_id: string;
    name: string;
    is_active: boolean;
    permissions: string[];
    is_system: boolean;
    is_essential: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProfileWrite {
    name: string;
    is_active: boolean;
    permissions: string[];
}
