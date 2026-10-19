import { safeReturnPath } from './return-url';

const ORIGIN = 'https://app.exemplo.com.br';

describe('safeReturnPath', () => {
    it('mantém caminhos internos com query e hash', () => {
        expect(safeReturnPath('/pages/administracao/contrato?first=20#topo', ORIGIN)).toBe('/pages/administracao/contrato?first=20#topo');
    });

    it('usa a home sem returnUrl ou para telas de entrada', () => {
        expect(safeReturnPath(null, ORIGIN)).toBe('/dashboards');
        expect(safeReturnPath('/contexto/selecao', ORIGIN)).toBe('/dashboards');
        expect(safeReturnPath('/landing/login?x=1', ORIGIN)).toBe('/dashboards');
        expect(safeReturnPath('/primeiro-acesso/trocar-senha', ORIGIN)).toBe('/dashboards');
    });

    it('recusa destinos externos, inclusive com caracteres que o navegador descarta', () => {
        for (const value of ['https://evil.com', '//evil.com', '/\t/evil.com', '/\n/evil.com', '/\\evil.com', '\\\\evil.com', ' /dashboards', 'javascript:alert(1)']) {
            expect(safeReturnPath(value, ORIGIN)).withContext(JSON.stringify(value)).toBe('/dashboards');
        }
    });
});
