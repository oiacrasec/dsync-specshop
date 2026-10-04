export const ACCESS_AUDIENCE = {
    AUTHENTICATED: 'authenticated',
    ADMIN: 'admin',
    COMMON: 'common'
} as const;

export type AccessAudience = (typeof ACCESS_AUDIENCE)[keyof typeof ACCESS_AUDIENCE];

export interface AccessGuardData {
    audience?: AccessAudience;
    requireContext?: boolean;
}
