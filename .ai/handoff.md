# Handoff

- **Atualizado em:** 2026-10-31
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-2-seguranca-dependencias.md
- **Commit deste lote:** fix(frontend): reduce dependency security warnings (este handoff integra o commit; hash em `git log -1`)
- **Lote anterior:** 3898118 — fix(deps): update Angular LTS and Pillow security releases

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 2.1 🔄 segundo lote frontend validado e aprovado para commit; 2.2 backend ✅ concluída |
| Próximo passo exato | Alinhar tratamento dos nove avisos do Karma/cobertura; migração do executor ainda não autorizada. Deploy é a prioridade seguinte, por alinhar |
| Aguardando o usuário? | sim — decisão sobre a próxima atividade; commit deste lote solicitado |

## Implementado / validado

- Primeiro lote: Angular 21.2.25 LTS, CLI/build 21.2.29, CDK 21.2.14,
  PostCSS 8.5.32, remoção de primeclt e Pillow 13.0.0. npm 101 → 48;
  produção 21 → 1. Python: 39 avisos → zero; SDK e requirements auditados.
- Autorização permanente para apagar arquivos comprovadamente desnecessários ao
  commitar registrada em modo-de-trabalho. backend/package-lock.json vazio,
  não versionado e acidental removido; lockfile frontend preservado/atualizado.
- Quill removido (único consumidor no CMS desabilitado); exemplo preservado com
  aviso de revisão/reinstalação antes de reativar. Autorização de limpeza supera
  a pergunta pendente anterior. Três plugins ESLint não carregados também removidos.
- ESLint 10.14.0 (9 em EOL), @eslint/js 10.0.1 explícito, typescript-eslint 8.72.1.
  Inicialização descartada removida de lib/utils.ts; nenhuma regra desativada.
- Overrides limitados: glob 13 → 14.0.3, minimatch 10 → 11.0.3 e uuid do SockJS →
  11.1.1. Não substituir minimatch 3 globalmente: API incompatível.
- npm 48 → **9 moderadas**, zero críticas/altas/baixas; produção 1 → **zero**.
  Resíduo: GHSA-g3hv-75wg-m249 de minimatch 3/Karma/cobertura/glob 7.
- 143 testes frontend, lint, formato, npm ls, build e smoke de ng serve passaram.
  Os 77 arquivos JS/CSS de produção ficaram idênticos por SHA-256.
- Antes de aplicar: 56.540 comparações minimatch, quatro padrões glob, cacache,
  HTTP/WebSocket SockJS e 25 casos da redução de dados passaram. Cobertura limitada
  aos caminhos citados; detalhes em docs/security/dependencies.md.
- Backend sem alteração neste lote; seus 769 testes e checks passaram no primeiro.
  Sem novas queries/escritas/locks; bundle ~1,31 MB. Licenças revisadas; OWASP A01–A10
  revisado, A03 residual explícito. npm audit completo continua saindo com código 1.

## Cuidados / próximas frentes

- Não ocultar avisos: npm sinaliza minimatch <11.0.1; mantenedor cita 10.2.6.
  Alcance aberto; sem decisão de migração nem aceitação definitiva dos avisos.
- Evidências: /tmp/datasync-lot2-final-{audit,audit-prod}.json e
  /tmp/datasync-lot2-final-{tests,build,lint,format,tree}.log. Comandos no relatório.
- Sem auditoria WCAG completa, E2E com API real ou teste de carga neste lote.
- Python SDK: /home/cesar/Virtual/datasync-core-3.14/bin/python; consultar PyCharm
  antes de cada comando. Suíte completa após subconjuntos: --reuse-db --create-db.
  pip-audit só em /tmp/datasync-pip-audit-tool; Gunicorn/WhiteNoise auditados pelos
  requirements, ausentes no SDK. Faixas dos requirements podem resolver versões novas.
- Não imprimir/versionar segredos. Push só quando pedido; nunca --amend na main.
- 9.1–9.5 concluídas (b54a38b). 5.3/superadmin paralisados até pedido explícito.
- Deploy: VPS/local com 1 ou N projetos derivados, banco sempre em outra VPS;
  alinhar Docker antes de implementar (decisões 94–95 da Entrega 1).
- Produção: retenção/expurgo/LegalHold (ADR 0007), HTTPS/CSP, cache/borda e recuperação.
- Conferência visual anterior login/MFA/filtros/contagem/seletor com API real pendente.
- FigCraft --control 7710 / MCP --attach 7710; salvar após editar.
- 20 mocks ZZ-01..ZZ-20 no CLIENTE X: apagar só quando pedido.
- Não reativar telas DESABILITADO sem aprovação.
