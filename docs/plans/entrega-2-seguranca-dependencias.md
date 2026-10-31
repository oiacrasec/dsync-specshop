# Entrega 2 — Segurança das dependências

Escopo aprovado pelo usuário: frontend e backend, começando pelo frontend.
Deploy em VPS / servidor local é a prioridade seguinte; requisitos registrados
nas decisões 94–95 da Entrega 1. A etapa 5.3 continua paralisada (decisão 93).

## Critérios

- Inventariar dependências diretas/transitivas e distinguir desenvolvimento/produção.
- Verificar correções nas fontes oficiais, preservando as linhas LTS vigentes.
- Atualizar em lotes compatíveis; revisar mudanças de API, licenças e impacto de performance.
- Rodar auditoria após correções, além de testes, lint, formatação e build/checks pertinentes.
- Documentar alertas restantes com alcance, correção disponível e eventual decisão necessária.
- Não aceitar regressões de isolamento/autenticação nem mascarar falhas da auditoria.
- Usuário revisa o resultado antes de cada commit.

## Etapas

| # | Entrega | Estado |
|---|---|---|
| 2.1 | Frontend: Angular 21 LTS e ferramentas associadas; corrigir alertas npm em lotes e validar | 🔄 Segundo lote validado e aprovado para commit; 9 moderadas residuais do executor de testes |
| 2.2 | Backend: auditar dependências Python de produção/desenvolvimento, corrigir e validar | ✅ Pillow atualizado/auditado/validado e commitado em 3898118 |

## Diagnóstico inicial — 2026-10-31

- `npm audit`: 101 dependências sinalizadas (5 críticas, 48 altas, 46 moderadas, 2 baixas).
- `npm audit --omit=dev`: 21 (0 críticas, 16 altas, 4 moderadas, 1 baixa).
- Angular instalado: 21.1.0. Registry oficial consultado: core/compiler 21.2.25,
  CLI/build 21.2.29; Angular 21 confirmado LTS em angular.dev/reference/releases.
- Alguns alertas do relatório sugerem downgrade ou não têm correção automática:
  avaliar individualmente após atualizar o conjunto principal.
- `pip-audit` ainda não instalado no SDK do projeto; auditoria Python pendente.

Fontes: https://angular.dev/reference/releases e registry oficial https://registry.npmjs.org.
Relatórios iniciais temporários: `/tmp/datasync-npm-audit-public.json` e
`/tmp/datasync-npm-audit-prod-before.json`.

## Primeiro lote implementado e validado

- Angular 21.2.25, CLI/build 21.2.29, CDK 21.2.14 e PostCSS 8.5.32;
  mínimos corrigidos no manifesto e lockfile sincronizado. Demais bibliotecas
  diretas mantidas nas versões instaladas. `primeclt` removida por não ter uso.
- `npm audit`: 101 → 48 (zero críticas/altas, 47 moderadas, 1 baixa).
  `--omit=dev`: 21 → 1 baixa, Quill. Naquele lote, dependência preservada enquanto
  aguardava decisão sobre retirar, manter ou avaliar versão anterior. A autorização
  posterior de limpeza permitiu a remoção no segundo lote.
- 47 moderadas são propagações de glob/minimatch/uuid em ferramentas. Correções
  de major ficam fora das faixas de dependentes. Sem override global/downgrade
  automático; próxima avaliação deve ser um lote compatível, não mascarar auditoria.
- Backend: Pillow 12.3.0 → 13.0.0 (MIT-CMU), revisão da API usada pela fachada de
  mídia e dos avisos de segurança. 39 avisos no Pillow → zero na auditoria do SDK;
  resolução dos requirements produção + desenvolvimento também sem avisos.
- Ferramentas `pip-audit` 2.10.1 instaladas somente em diretório temporário, fora do SDK.
- Validação: 143 testes frontend + lint/formato/build/npm ls; 769 backend + pip check,
  ruff check/format, migrations check, check e check --deploy passaram.
- Bundle inicial 1,30 → 1,31 MB (~272,20 kB estimados); sem mudança de consultas/locks
  da aplicação e sem teste de carga. Licenças das dependências alteradas revisadas.
- OWASP A01–A10 revisado no diff; pendências A03 explícitas, auditoria npm não está limpa.
- Usuário autorizou o commit do lote validado, preservando as 48 pendências npm
  documentadas (3898118); Quill e parte das ferramentas tratados no segundo lote.
  Não iniciar deploy neste lote.

## Segundo lote — autorizado para resolver o máximo preservando o produto

- Usuário autorizou limpar arquivos desnecessários ao commitar; preferência registrada
  em modo-de-trabalho. `backend/package-lock.json` vazio removido.
- Removidos Quill (só CMS desabilitado) e três plugins ESLint não carregados pelo config.
  Exemplo CMS preservado, com requisito de revisão/reinstalação antes de reativá-lo.
- ESLint 10.14.0 (9 em EOL), @eslint/js 10.0.1 explícito, typescript-eslint 8.72.1.
  Regra nova achou uma inicialização descartada: removido somente `= []` de tempData.
- Overrides limitados, fixos e testados: glob 13 → 14.0.3; minimatch 10 → 11.0.3;
  uuid do SockJS → 11.1.1. Minimatch 3 preservado por incompatibilidade de API com 11.
- Auditoria npm: 48 → **9 moderadas**, nenhuma crítica/alta/baixa; produção: 1 → **0**.
- 143 testes, lint, formato, npm ls, build e smoke de ng serve passaram. Os 77 arquivos
  JS/CSS de produção permaneceram idênticos por SHA-256. Compatibilidade de padrões,
  seleção de arquivos, cache e WebSocket testada antes de aplicar no projeto.
- Licenças revisadas, sem alteração no backend; usuário revisou o resultado e solicitou
  commit do segundo lote, com as nove pendências documentadas.
- Resíduo do Karma/cobertura precisa de modernização do executor ou correção compatível
  em lote próprio. Não mascarar nem aceitar o aviso como resolvido. Deploy segue por alinhar.

Relatório e fontes oficiais: [docs/security/dependencies.md](../security/dependencies.md).
