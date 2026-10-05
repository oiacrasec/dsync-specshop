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
