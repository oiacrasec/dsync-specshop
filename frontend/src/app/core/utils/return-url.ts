const DEFAULT_PATH = '/dashboards';
// Telas de autenticação/contexto nunca são destino de retorno (evita voltar ao fluxo de entrada).
const BLOCKED_PATH = /^\/(contexto|primeiro-acesso|landing)(\/|$)/;

// O navegador descarta tabulação/quebra de linha ao montar a URL: `/\t/host` viraria `//host`.
function hasUnsafeChars(value: string) {
    return [...value].some((char) => {
        const code = char.charCodeAt(0);

        return code <= 0x1f || code === 0x7f || char === '\\' || /\s/.test(char);
    });
}

/** Caminho interno seguro para `returnUrl` (open redirect): mesma origem, sem host externo. */
export function safeReturnPath(returnUrl: string | null, origin: string): string {
    if (!returnUrl || hasUnsafeChars(returnUrl) || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
        return DEFAULT_PATH;
    }

    try {
        const url = new URL(returnUrl, origin);

        if (url.origin !== origin || BLOCKED_PATH.test(url.pathname)) {
            return DEFAULT_PATH;
        }

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return DEFAULT_PATH;
    }
}
