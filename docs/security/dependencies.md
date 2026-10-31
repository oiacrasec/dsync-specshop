# Revisão de dependências — 2026-10-31

Entrega 2, escopo autorizado: frontend e backend. Retrato das auditorias nesta data;
não equivale a garantia de ausência de vulnerabilidades.

## Resultados

| Escopo | Inicial | Primeiro lote (`3898118`) | Segundo lote |
|---|---|---|---|
| npm completo | 101: 5 críticas, 48 altas, 46 moderadas, 2 baixas | 48: 47 moderadas, 1 baixa | **9 moderadas**, zero críticas/altas/baixas |
| npm sem desenvolvimento (`--omit=dev`) | 21: 16 altas, 4 moderadas, 1 baixa | 1 baixa (Quill) | **0 avisos** |
| Python instalado no SDK | 39 avisos no Pillow 12.3.0 | 0 em 45 pacotes | sem alteração neste lote |
| Python: requirements produção + desenvolvimento resolvidos | não auditado antes | 0 em 43 pacotes | sem alteração neste lote |

As contagens npm incluem a propagação dos avisos aos pacotes dependentes. Os nove
restantes têm uma única origem: `minimatch` 3 usado pelo executor Karma e sua cobertura.

## Primeiro lote

Angular framework/compiler 21.2.25, CLI/build 21.2.29 e CDK 21.2.14, mantendo Angular
21 LTS; PostCSS 8.5.32; ferramenta `primeclt` sem uso removida. Piso das versões
corrigidas declarado no manifesto e lockfile. Pillow 13.0.0 (MIT-CMU), com correções
de segurança e revisão das APIs usadas pela fachada de mídia.

Fontes: [Angular](https://angular.dev/reference/releases),
[sanitização Angular](https://github.com/angular/angular/security/advisories/GHSA-hh8m-fm6v-7cvg),
[Pillow 13](https://pillow.readthedocs.io/en/stable/releasenotes/13.0.0.html).

## Segundo lote — correções

| ID / categoria | Local | Achado e correção |
|---|---|---|
| A03-01 — ferramenta sem manutenção | `frontend/package.json:48` | ESLint 9 em EOL desde 2026-08-06; atualizado para 10.14.0, compatível com os peers do angular-eslint 21.4.0. @eslint/js 10.0.1 declarado diretamente, pois é importado pelo config; typescript-eslint 8.72.1 |
| A03-02 — dependência sem correção publicada | `frontend/package.json` e `frontend/src/app/pages/examples/cms/edit.ts:9` | Quill 2.0.3 removido conforme autorização para limpar o que não é necessário. Seu único consumidor é o exemplo CMS desabilitado; exemplo preservado, com aviso para revisar segurança/reinstalar dependência antes de reativar |
| A03-03 — ferramentas herdadas sem uso | `frontend/eslint.config.mjs:3` | Removidos eslint-plugin-import, eslint-plugin-prefer-arrow e eslint-plugin-prettier; nenhum era carregado pelo flat config. eslint-config-prettier continua ativo e as regras existentes foram preservadas |
| A03-04 — transitivas com correção fora da faixa | `frontend/package.json:62` | Overrides limitados: glob 13 → 14.0.3; minimatch 10 → 11.0.3; uuid do SockJS → 11.1.1. Versões fixas, CommonJS/API dos consumidores revisados e validados; não se aplica substituição global ao minimatch 3 |

O ESLint 10 identificou uma inicialização descartada em `frontend/src/app/lib/utils.ts:12`.
Removido somente `= []` da variável temporária: comparações confirmaram os resultados
anteriores da redução de dados. Nenhuma regra foi desativada para passar o lint.
Nenhum endpoint, contrato de API, tela ativa, autenticação ou regra de autorização mudou.

Fontes: [suporte ESLint](https://eslint.org/version-support/),
[migração ESLint 10](https://eslint.org/docs/latest/use/migrate-to-10.0.0),
[Quill](https://github.com/advisories/GHSA-v3m3-f69x-jf25),
[glob](https://github.com/isaacs/node-glob/security/advisories/GHSA-3g3m-2fjr-6pw4),
[minimatch](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249),
[uuid](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).

## Validação dos overrides e preservação do produto

O segundo lote foi instalado primeiro em diretório temporário, com cópia das fontes
relevantes e os mesmos arquivos de configuração. Depois aplicado e validado no projeto:

- 143 testes ChromeHeadless, lint, formato, npm ls e build de produção passaram.
- `ng serve`: `/perfil` e seu `main.js` compilado responderam HTTP 200 em porta local temporária.
- **77 arquivos JavaScript/CSS de produção idênticos por SHA-256 antes/depois**:
  nenhum arquivo adicionado/removido/alterado nesse conjunto. Bundle inicial ~1,31 MB.
- 56.540 comparações minimatch 10/11, incluindo filtros do projeto, opções e instâncias
  de Minimatch, retornaram resultados iguais no corpus verificado.
- Glob 13/14 selecionaram os mesmos arquivos em quatro padrões do projeto;
  cacache put/get/verify/remove passou com glob 14.
- SockJS com uuid 11: HTTP info, handshake WebSocket e eco passaram.
- 25 comparações da função de redução de dados (incluindo entrada vazia) passaram.
- Dependências alteradas têm licenças compatíveis, sem AGPL/GPL ou ausentes.
- Backend não foi alterado no segundo lote; seus 769 testes, pip check, ruff,
  migrations check e checks Django/produção passaram no primeiro lote.
- Sem auditoria WCAG completa, E2E com API real ou teste de carga neste lote.
  Compatibilidade verificada nos caminhos citados, sem garantia para toda API dos pacotes.

Os overrides devem ser reavaliados quando os dependentes publicarem versões que
aceitem os pacotes corrigidos. Não usar `npm audit fix --force` como substituto dessa
avaliação. `npm ci --ignore-scripts` foi usado nas instalações de verificação; binários
opcionais necessários ao build/teste funcionaram.

## Pendência residual — A03-05 (moderada)

`frontend/package.json:51` e `:53`: Karma 6.4.4 e karma-coverage 2.2.1 mantêm
minimatch 3.1.5; glob 7 também o utiliza. Isso propaga nove avisos no npm audit
(GHSA-g3hv-75wg-m249). Não entram na auditoria de dependências de produção.

**Trocar minimatch 3 diretamente por 11 é incompatível**: os consumidores antigos
chamam o export CommonJS como função (ex.: `karma-coverage/lib/preprocessor.js:117`),
enquanto a versão 11 exporta um objeto com funções nomeadas. Não foi forçada essa troca.
Eliminar esse legado requer atualizar/migrar o executor e sua integração de cobertura
em lote próprio; ainda não há decisão de migração nem aceitação definitiva desses avisos.

Há divergência de alcance: o npm sinaliza `<11.0.1`; o texto do mantenedor cita
especificamente 10.2.6 com `optimizationLevel >= 2`. Não se assume que 3.x está segura
por essa diferença. O aviso permanece visível; `npm audit` completo retorna código 1.
Categorias OWASP A01–A10 revisadas no escopo do diff; A03 mantém essa pendência explícita.

## Repetir auditorias

Frontend: `npm audit --json` e `npm audit --omit=dev --json` em `frontend/`.

Backend: com pip-audit 2.10.1 em ambiente de auditoria, conferir o SDK instalado
(`--path <site-packages>`) e os requirements com
`python -m pip_audit -r requirements/production.txt -r requirements/development.txt`.
Consultar o SDK do PyCharm antes de comandos Python. No primeiro lote, as ferramentas
foram instaladas só em diretório temporário separado. Gunicorn/WhiteNoise não estavam
no SDK de desenvolvimento: cobertos pela resolução auditada de produção.
Requirements contêm faixas; o conjunto resolvido pode mudar numa auditoria futura.
