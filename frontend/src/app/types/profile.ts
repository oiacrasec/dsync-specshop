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
