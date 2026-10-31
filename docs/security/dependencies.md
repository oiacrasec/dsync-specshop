# Revisão de dependências — 2026-10-31

Entrega 2, escopo autorizado: frontend e backend. Este é um retrato da auditoria
nesta data, não uma garantia de ausência de vulnerabilidades.

## Resultados

| Escopo | Antes | Após as correções |
|---|---|---|
| npm completo | 101: 5 críticas, 48 altas, 46 moderadas, 2 baixas | 48: 0 críticas/altas, 47 moderadas, 1 baixa |
| npm sem desenvolvimento (`--omit=dev`) | 21: 16 altas, 4 moderadas, 1 baixa | 1 baixa (Quill) |
| Python instalado (SDK do projeto) | 39 avisos no Pillow 12.3.0 | 0 avisos em 45 pacotes |
| Python: resolução de requirements produção + desenvolvimento | não auditado antes | 0 avisos em 43 pacotes |

As contagens npm incluem pacotes afetados pela propagação de uma dependência
vulnerável. Os 47 moderados restantes derivam de três bibliotecas de ferramentas:
`glob`, `minimatch` e `uuid`, não de 47 falhas independentes na aplicação.

## Correções aplicadas

- Angular framework/compiler: 21.1.0 → **21.2.25**; CLI/build: **21.2.29**;
  CDK: **21.2.14**. Angular 21 permanece a linha LTS escolhida. Versões mínimas
  corrigidas declaradas no `package.json` e resolvidas no lockfile.
- PostCSS: 8.5.6 → **8.5.32**, dentro da linha 8.
- `primeclt`: removida ferramenta herdada sem referência em código, scripts ou
  documentação operacional; removidas suas dependências transitivas vulneráveis.
- Pillow: 12.3.0 → **13.0.0**, que corrige os avisos encontrados. License MIT-CMU
  mantida. Mudanças incompatíveis da release revisadas contra `apps/core/media.py`:
  operações usadas são abrir, transpor EXIF, converter, redimensionar e gravar WebP.
- Nenhuma mudança de endpoint, autenticação, regra de autorização ou schema de banco.

O npm recusou resolver o conjunto antigo parcialmente atualizado. O novo conjunto
foi resolvido em diretório temporário, preservando as versões diretas não relacionadas
ao lote; o lockfile foi sincronizado e instalado com `npm ci --ignore-scripts`.
Build e testes confirmam os binários opcionais necessários. Dependências alteradas
do lockfile têm licenças permissivas; não foram introduzidas AGPL/GPL ou sem licença.

Fontes: [política Angular](https://angular.dev/reference/releases),
[correção de sanitização Angular](https://github.com/angular/angular/security/advisories/GHSA-hh8m-fm6v-7cvg),
[Pillow 13.0.0](https://pillow.readthedocs.io/en/stable/releasenotes/13.0.0.html)
e metadados oficiais npm/PyPI.

## Pendências explícitas

| Biblioteca / aviso | Alcance verificado | Situação |
|---|---|---|
| Quill 2.0.3 / GHSA-v3m3-f69x-jf25 | Dependência de produção, usada só pelo exemplo CMS desabilitado; sem marcadores Quill nos bundles gerados | Sem versão corrigida publicada; pergunta ao usuário sobre retirar a dependência e manter exemplo desabilitado |
| glob / GHSA-3g3m-2fjr-6pw4 | Ferramentas CLI, via `@npmcli/package-json` e `cacache`, exigem `^13.0.0` | Correção em >=14.0.2; não cabe na faixa atual dos dependentes |
| minimatch / GHSA-g3hv-75wg-m249 | Ferramentas de lint/build/teste exigem versões 3/10 | Correção indicada em 11.0.1; avaliar migração dos dependentes, sem override global incompatível |
| uuid / GHSA-w5hq-g745-h8pq | Dependência de desenvolvimento via SockJS (`^8.3.2`) | Correção em 11.1.1/12.0.1/13.0.1, fora da faixa atual de SockJS |

Não foram aplicados overrides de major nem downgrades automáticos sugeridos pelo
`npm audit fix --force`. Os alertas continuam visíveis e não foram aceitos como
resolvidos. Para ferramentas, revisar atualização dos dependentes ou outra correção
compatível em um lote próprio. Não foi demonstrado um caminho desses três avisos
pela API Django ou pelo frontend compilado; isso não prova segurança das ferramentas.

O npm classifica minimatch `<11.0.1` como afetado; o aviso do mantenedor cita
especificamente 10.2.6. Essa divergência de alcance fica aberta: não considerar
as versões antigas seguras só por não estarem explicitadas no texto do mantenedor.

Fontes: [Quill](https://github.com/advisories/GHSA-v3m3-f69x-jf25),
[glob](https://github.com/isaacs/node-glob/security/advisories/GHSA-3g3m-2fjr-6pw4),
[minimatch](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249),
[uuid](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).

## Validação e limites

- 143 testes ChromeHeadless, lint, formato e build de produção passaram.
- 769 testes backend, `pip check`, ruff check/format, migrations check,
  system checks e checks de produção passaram.
- Bundle inicial: cerca de 1,30 → 1,31 MB; transferência estimada 269,76 → 272,20 kB.
  Não há alteração de consultas/locks/escritas do produto; sem ensaio de carga.
- Fluxos de perfil/mídia, login/MFA, isolamento e autorização cobertos pela suíte.
  Não houve auditoria WCAG completa ou E2E com API real nesta revisão.
- Categorias OWASP A01–A10 revisadas no escopo do diff; A03 permanece com as
  pendências da tabela, sem declarar auditoria integralmente limpa.
- Gunicorn/WhiteNoise não estão no SDK de desenvolvimento: cobertos pela resolução
  auditada dos requirements de produção. Testes rodam no SDK, não nessa resolução.
- `pip-audit` 2.10.1 executado com ferramentas em diretório temporário separado;
  não foi adicionado ao ambiente nem às dependências runtime do projeto.

## Repetir a auditoria

Frontend: `npm audit --json` e `npm audit --omit=dev --json`, na pasta `frontend/`.
O comando retorna código diferente de zero enquanto houver avisos.

Backend: com `pip-audit` disponível em ambiente de auditoria, auditar tanto o SDK
instalado (`--path <site-packages>`) quanto os requirements:
`python -m pip_audit -r requirements/production.txt -r requirements/development.txt`.
Consultar o SDK configurado antes de executar comandos Python (skill python-tools).
Requirements possuem faixas: o conjunto resolvido pode mudar na próxima execução.
