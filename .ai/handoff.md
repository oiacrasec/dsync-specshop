# Handoff

- **Atualizado em:** 2026-10-18
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md (Bloco 7 = prioridade)
- **Último commit:** 93792fb fix(frontend): refresh sort icons when clearing table filters

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 7.1 organizações na área do cliente (ADR 0037) — ✅ implementada, **não commitada** (aguarda revisão) |
| Próximo passo exato | usuário revisar/commitar a 7.1; depois 7.2 (`GET /api/v1/me/permissions/`) |
| Aguardando o usuário? | sim — revisão do diff da 7.1 |

## Concluído

0.1–0.3 · 1.1–1.2 · 2.1–2.5 · 3.1–3.6 · 4.1 · 5.1–5.2 · 6.1–6.8 · 7.1 (sem commit).
Pendentes: 7.2 → 7.3 → 7.4; depois 5.3, 5.4 (restante: usuários, perfis, atribuições) e 5.5.

- 6.6–6.8: provisionamento (409 contract-not-provisionable), admins/reset (refresh trava
  usuário → token), frontend de contratos no Core. audit.0007/0008 aplicadas ao banco local.
- Após a 6.8 (com push): schema com `type` semântico nas colunas; LOCALE_ID pt-BR e `shortDate`;
  adaptador `core/utils/table-schema.ts` + `BaseCrudService.listTable/lookupOptions`; `serverUrl`;
  topbar mobile; card centralizado sem menu; entrada direta com organização única; open redirect
  corrigido (`safeReturnPath`); "Limpar" zera ordenação e ícones.
- 7.1/decisões 45–49: organizações só na área do cliente; `/admin/organizations/` removida (404);
  `organization:view/create/update/delete` não reservadas (`create` só CONTRACT); `view` em
  qualquer escopo lista o contrato inteiro; suporte do superadmin adiado.

## Dúvidas abertas

- 7.3: editar/excluir seguem a lógica da visão? (quem tem `organization:update` em qualquer
  escopo edita qualquer organização do contrato, ou só as do escopo da concessão). Perguntar.

## Avisos

- validar.sh procura `.venv` na raiz; o venv local é `~/Virtual/datasync-core-3.14`.
  Usuário pediu para não mexer em config/docs de ambiente: rodar os passos à mão.
- Commits só após revisão do usuário; nunca `--amend` na main (ajuste = commit novo).
- Regras do frontend em `frontend/AGENTS.md`: reuso antes de tela, URLs só via API_BASE_URL,
  tipo semântico + LOCALE_ID, ids validados/codificados, `safeReturnPath`.
- Não reativar telas DESABILITADO sem aprovação (a 7.4 reativa organizações, aprovada).
- JWT localStorage (ADR 0035); HTTPS/CSP, cache compartilhado/borda/MFA e expurgo antes de produção.
- npm audit (88 vulns) adiado pelo usuário até o front ficar mais redondo. Push só quando pedido.
