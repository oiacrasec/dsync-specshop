export function apiPath(url: string, baseUrl: string): string | null {
    if (!baseUrl.trim()) {
        return null;
    }

    try {
        const base = new URL(baseUrl, window.location.origin);
        const target = new URL(url, window.location.origin);
        const prefix = base.pathname.replace(/\/+$/, '');

        if (base.origin !== target.origin || !target.pathname.startsWith(`${prefix}/`)) {
            return null;
        }

        return target.pathname.slice(prefix.length);
    } catch {
        return null;
    }
}

export function apiEndpoint(baseUrl: string, path: string): string {
    if (!baseUrl.trim()) {
        throw new Error('API_BASE_URL não configurada.');
    }

    return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

/**
 * Caminho absoluto devolvido pelo backend (ex.: `options_url` do schema) na origem da API.
 * Não depende do prefixo de versão: vale para `API_BASE_URL` relativo (proxy de dev) ou absoluto.
 * Só aceita caminho do próprio servidor (`/...`); URL completa ou `//host` é recusada.
 */
export function serverUrl(path: string, baseUrl: string): string {
    if (!baseUrl.trim()) {
        throw new Error('API_BASE_URL não configurada.');
    }

    if (!path.startsWith('/') || path.startsWith('//')) {
        throw new Error('Caminho do servidor inválido.');
    }

    const base = new URL(baseUrl, window.location.origin);

    return base.origin === window.location.origin ? path : `${base.origin}${path}`;
}

// Rotas da API sem credencial (sessão ainda não existe ou é a própria renovação).
export const PUBLIC_AUTH_PATHS = ['/auth/login/', '/auth/login/mfa/', '/auth/refresh/', '/auth/logout/'];

// X-Organization-Id só na área do cliente: superadmin, autenticação, admin e troca de organização ficam sem.
export function needsOrganizationHeader(path: string, superuser: boolean): boolean {
    return !superuser && !path.startsWith('/auth/') && !path.startsWith('/admin/') && !path.startsWith('/me/mfa/') && path !== '/me/organizations/';
}
