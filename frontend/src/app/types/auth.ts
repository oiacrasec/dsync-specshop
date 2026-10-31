export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginUser {
    public_id: string;
    username: string;
    name: string;
    is_superuser: boolean;
    must_change_password: boolean;
}

export interface TokenRefreshRequest {
    refresh: string;
}

export interface TokenRefreshResponse {
    access: string;
    refresh: string;
}

export interface LoginResponse extends TokenRefreshResponse {
    user: LoginUser;
}

export interface MfaLoginChallenge {
    mfa_required: true;
    mfa_token: string;
    expires_in: number;
}

export interface MfaLoginRequest {
    mfa_token: string;
    code: string;
}

export interface FirstAccessPasswordChangeRequest {
    current_password: string;
    new_password: string;
    new_password_confirm: string;
}

export interface FirstAccessPasswordChangeResponse {
    user: LoginUser;
}

// DESABILITADO: contratos herdados de telas ainda não adaptadas à API do core.
export type UserType = 'INTERNAL' | 'CITIZEN';
export type UserAccessStatus = 'ATIVO' | 'BLOQUEADO' | 'INATIVO';
