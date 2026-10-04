export interface LoginRequest {
    username: string;
    password: string;
}

export type UserType = 'INTERNAL' | 'CITIZEN';
export type UserAccessStatus = 'ATIVO' | 'BLOQUEADO' | 'INATIVO';

export interface LoginUser {
    uuid: string;
    username: string;
    name: string;
    email: string;
    is_superuser: boolean;
    user_type: UserType;
    status_acesso: UserAccessStatus;
    must_change_password: boolean;
}

export interface LoginResponse {
    access: string;
    refresh: string;
    access_expires_in: number;
    refresh_expires_in: number;
    user: LoginUser;
}

export interface TokenRefreshRequest {
    refresh: string;
}

export interface TokenRefreshResponse {
    access: string;
    refresh?: string;
}

export interface TokenVerifyRequest {
    token: string;
}

export interface FirstAccessPasswordChangeRequest {
    current_password: string;
    new_password: string;
    new_password_confirm: string;
}

export interface FirstAccessPasswordChangeResponse {
    detail: string;
}
