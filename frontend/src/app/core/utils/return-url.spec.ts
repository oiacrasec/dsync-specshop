import { safeReturnPath } from './return-url';

const ORIGIN = 'https://app.exemplo.com.br';

describe('safeReturnPath', () => {
    it('mantém caminhos internos com query e hash', () => {
        expect(safeReturnPath('/pages/administracao/contrato?first=20#topo', ORIGIN)).toBe('/pages/administracao/contrato?first=20#topo');
    });

    it('usa a home sem returnUrl ou para telas de entrada', () => {
        expect(safeReturnPath(null, ORIGIN)).toBe('/kpi');
        expect(safeReturnPath('/contexto/selecao', ORIGIN)).toBe('/kpi');
        expect(safeReturnPath('/landing/login?x=1', ORIGIN)).toBe('/kpi');
        expect(safeReturnPath('/primeiro-acesso/trocar-senha', ORIGIN)).toBe('/kpi');
    });

    it('recusa destinos externos, inclusive com caracteres que o navegador descarta', () => {
        for (const value of ['https://evil.com', '//evil.com', '/\t/evil.com', '/\n/evil.com', '/\\evil.com', '\\\\evil.com', ' /kpi', 'javascript:alert(1)']) {
            expect(safeReturnPath(value, ORIGIN)).withContext(JSON.stringify(value)).toBe('/kpi');
        }
    });
});
