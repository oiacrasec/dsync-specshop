// GET/PUT /api/v1/me/profile/ (docs/api/profile.md, etapa 9.2).
export interface MyProfile {
    username: string;
    name: string;
    time_zone: string;
    avatar_url: string;
}

export interface MyProfileWrite {
    name: string;
    time_zone: string;
    avatar?: File | null;
    remove_avatar?: boolean;
}

export const SYSTEM_TIME_ZONE = 'America/Sao_Paulo';

// GET /api/v1/me/sessions/ (9.3): onde a conta está conectada agora.
export interface UserSession {
    public_id: string;
    device: string;
    ip: string;
    created_at: string;
    last_seen_at: string;
    current: boolean;
}

// GET /api/v1/me/logins/: últimos logins da conta.
export interface LoginHistoryItem {
    occurred_at: string;
    ip: string;
}

// GET /api/v1/me/access/: retrato das próprias permissões em todas as organizações acessíveis.
export interface MyOrganizationAccess {
    public_id: string;
    name: string;
    profiles: { public_id: string; name: string }[];
    permissions: string[];
    all_permissions: boolean;
}

export interface MyAccess {
    organizations: MyOrganizationAccess[];
}
