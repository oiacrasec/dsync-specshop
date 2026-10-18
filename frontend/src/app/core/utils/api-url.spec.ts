import { serverUrl } from './api-url';

describe('serverUrl', () => {
    it('mantém o caminho quando a API está na mesma origem (proxy de desenvolvimento)', () => {
        expect(serverUrl('/api/v1/admin/plans/options/', '/api/v1')).toBe('/api/v1/admin/plans/options/');
    });

    it('usa a origem da API absoluta, sem depender do prefixo de versão', () => {
        expect(serverUrl('/api/v2/admin/plans/options/', 'https://api.exemplo.com.br/api/v2')).toBe('https://api.exemplo.com.br/api/v2/admin/plans/options/');
    });

    it('recusa URL completa, host relativo e base vazia', () => {
        expect(() => serverUrl('https://outro.com/x/', '/api/v1')).toThrowError();
        expect(() => serverUrl('//outro.com/x/', '/api/v1')).toThrowError();
        expect(() => serverUrl('/api/v1/x/', ' ')).toThrowError();
    });
});
