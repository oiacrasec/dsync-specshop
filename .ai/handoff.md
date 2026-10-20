# Handoff

- **Atualizado em:** 2026-10-19
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md (Blocos 7 e 8 concluídos)
- **Último commit:** a7038cb feat(frontend): add the settings screen and drop the theme drawer

## Situação

| Item | Estado |
|---|---|
| Etapa atual | Bloco 8 (8.1–8.5) ✅ commitado; rbac.0004 e users.0005 aplicadas ao banco local |
| Próximo passo exato | Usuário escolher o próximo bloco entre as pendências listadas abaixo |
| Aguardando o usuário? | sim — escolha do próximo bloco |

## Concluído

0.1–0.3 · 1.1–1.2 · 2.1–2.5 · 3.1–3.6 · 4.1 · 5.1–5.2 · 5.4 (via Blocos 7–8) · 6.1–6.8 · 7.1–7.4 ·
8.1–8.5.

## Pendências (para escolher o próximo bloco)

| Item | O que falta | Origem |
|---|---|---|
| 5.3 Admin de usuários | CRUD de superadmins na área admin (auditar criação e mudança de `is_superuser`); admins adicionais de um contrato pelo superadmin (6.6 cria só o 1º; 6.7 lista e reseta) | ADR 0010 |
| 5.5 OpenAPI | `drf-spectacular` não instalado; schema/Swagger só para autenticados | ADR 0004 |
| Suporte do superadmin | entrar numa organização de cliente (contrato → organização), com auditoria | ADR 0037 §5, decisão 49 |
| Antes de produção | MFA do superadmin; HTTPS/CSP; cache compartilhado/borda; expurgo pós-contrato | ADRs 0010, 0035 |
| Frontend | `npm audit` (88 vulns, adiado); itens "Perfil" e "Agenda" do avatar sem ação; telas DESABILITADO (setores, geoespacial) | handoff |
| Repositório | push para o remoto (só quando pedido) | — |

- 6.6–6.8: provisionamento (409 contract-not-provisionable), admins/reset (refresh trava
  usuário → token), frontend de contratos no Core. audit.0007/0008 aplicadas ao banco local.
- Após a 6.8 (com push): schema com `type` semântico nas colunas; LOCALE_ID pt-BR e `shortDate`;
  adaptador `core/utils/table-schema.ts` + `BaseCrudService.listTable/lookupOptions`; `serverUrl`;
  topbar mobile; card centralizado sem menu; entrada direta com organização única; open redirect
  corrigido (`safeReturnPath`); "Limpar" zera ordenação e ícones.
- 7.1/decisões 45–49: organizações só na área do cliente; `/admin/organizations/` removida (404);
  `organization:view/create/update/delete` não reservadas (`create` em qualquer escopo desde a 62);
  `view` em qualquer escopo lista o contrato inteiro; suporte do superadmin adiado.

- 8.2/8.3: perfis do cliente + catálogo `/permissions/`; aba Permissões do usuário
  (`GET/PUT /users/{id}/access/`, perfil vinculado, "Todas as organizações" = CONTRACT com exceções,
  Salvar único). Admin do contrato = perfil essencial aplicado pelo seletor (decisão 63).
  8.4: exceção de permissão na atribuição (ADR 0038, decisão 64): caixas livres, perfil vinculado.
  `organization:create` em qualquer escopo (62). Formulários com aba Principal (61).
  Usuários/perfis/atribuições continuam reservados (decisão 54 mantida em 2026-10-19).
- 8.5 (decisões 65–66): tela `/configuracoes` (menu do avatar); aparência no usuário
  (`/me/preferences/`, `users.0005`); `ThemeService` substitui o configurador do template.

## Dúvidas abertas

- Nenhuma. 7.3 decidida (50–53): código em qualquer escopo vale no contrato todo; em uso 409;
  última ativa 409; nome único 422. audit.0009 aplicada ao banco local com autorização.

## Avisos

- validar.sh procura `.venv` na raiz; o venv local é `~/Virtual/datasync-core-3.14`.
  Usuário pediu para não mexer em config/docs de ambiente: rodar os passos à mão.
- Commits só após revisão do usuário; nunca `--amend` na main (ajuste = commit novo).
- Regras do frontend em `frontend/AGENTS.md`: reuso antes de tela, URLs só via API_BASE_URL,
  tipo semântico + LOCALE_ID, ids validados/codificados, `safeReturnPath`.
- Não reativar telas DESABILITADO sem aprovação (a 7.4 reativa organizações, aprovada).
- Home virou `/dashboards` em branco (KPI removida a pedido); `pages/dashboards/` é arquivo do projeto (ADR 0036).
- JWT localStorage (ADR 0035); HTTPS/CSP, cache compartilhado/borda/MFA e expurgo antes de produção.
- Font Awesome Free 7.3.1 por classe (atribuição CC BY no README do frontend); orçamento de aviso 2 MB.
- npm audit (88 vulns) adiado pelo usuário até o front ficar mais redondo. Push só quando pedido.
