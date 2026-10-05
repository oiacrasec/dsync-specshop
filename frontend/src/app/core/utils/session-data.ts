import { LoginUser } from '@/app/types/auth';

export const SESSION_KEY = 'dsc_session_v1';
export const CONTEXT_KEY = 'dsc_active_context_v1';
export const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function tokenExpiresAt(token: string): number | null {
    try {
        const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(part));

        return typeof payload.exp === 'number' && Number.isFinite(payload.exp) && payload.exp > 0 ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

export function isLoginUser(value: unknown): value is LoginUser {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const user = value as LoginUser;

    return typeof user.public_id === 'string' && UUID_PATTERN.test(user.public_id) && typeof user.username === 'string' && typeof user.name === 'string' && typeof user.is_superuser === 'boolean' && typeof user.must_change_password === 'boolean';
}
