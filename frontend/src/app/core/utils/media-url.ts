import { serverUrl } from './api-url';

/**
 * Único ponto que transforma a URL de mídia da API em `src` (ADR 0039). Modo filesystem: caminho
 * assinado `/api/v1/media/<token>/`, resolvido na origem da API. Modo S3: URL pre-signed absoluta
 * (https), usada como veio. Vazio ou qualquer outra coisa → null (a tela mostra o padrão).
 */
export function mediaUrl(url: string | null | undefined, baseUrl: string): string | null {
    if (!url) {
        return null;
    }

    if (url.startsWith('https://') || url.startsWith('http://')) {
        return url;
    }

    try {
        return serverUrl(url, baseUrl);
    } catch {
        return null;
    }
}
