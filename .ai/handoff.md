# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md (Bloco 6 = prioridade)
- **Último commit:** etapa 6.2a + orçamento do bundle (`chore(frontend): set the initial bundle budget...`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 6.2a Qualidade do frontend — ✅ concluída (orçamento do bundle: aviso 1,3 MB, aprovado) |
| Próximo passo exato | **6.3**: criar `backend/apps/administration` (API do superadmin), mover para ele a API admin de planos e contratos de `contracts` (views, serializers, filters, URLs) **sem mudar o contrato da API**; `Contract.plan` opcional (migration + `docs/domain/contracts.md`) |
| Aguardando o usuário? | sim — confirmar o início da 6.3 |

## Concluído na entrega 1

0.1–0.3 · 1.1–1.2 · 2.1–2.5 · 3.1–3.6 · 4.1 · 5.1–5.2 · 6.1 · 6.2 · 6.2a.
Ordem do Bloco 6: 6.3 → 6.4 → 6.5 → 6.6 → 6.7 → 6.8 (detalhes e decisões 37–40 no plano).

## Decisões vigentes do Bloco 6 (resumo; fonte: plano, decisões 37–40)

- `contracts` = domínio (Plan, Contract, Organization, usado por todos); `administration` =
  só a API do superadmin (`/api/v1/admin/…`), sem models próprios. Exige ADR novo na 6.3.
- Primeiro acesso (referência Spatial/GIS): provisionamento cria 1ª organização + admin do
  contrato (perfil essencial), só se o contrato não tem usuários; senha temporária devolvida
  uma vez (no-store, nunca em log/auditoria); bloqueio **no backend** até trocar a senha
  (exceto troca, refresh, logout); login devolve resumo do usuário; listar admins e resetar
  senha (reset revoga refresh tokens). Superadmin fora do fluxo. Futuro: envio assíncrono
  (tabela de eventos + Celery/Dramatiq).
- `Contract.plan` opcional; formulário lista planos (vazio por ora); tela de planos no futuro.
- Seleção de organização pronta na 6.5 para usuários comuns (superadmin não tem organização).

## Frontend (`frontend/`, copiado do datasync-gis)

- Angular 21 LTS + PrimeNG 21; Node 24 no Docker. `npm run lint`, `npm run format:check`,
  `npm run build` passando. 4 espaços.
- Telas ativas: login, primeiro acesso, seleção de organização, administração de contratos,
  home KPI fictícia (usuário pediu manter) e páginas de erro. O resto está comentado com
  `DESABILITADO: fora do escopo atual` (rotas, menu e `ignores` do `eslint.config.mjs`).
- Services/types das telas ainda falam a API do **Spatial** (português, `id` inteiro):
  adaptar na 6.5/6.8. Environments homol/prod com URL vazia (definir no deploy).
- Referências: `D:\Projetos\PycharmProjects\datasync-spatial` (backend) e `datasync-gis`.

## Pendente fora do Bloco 6

- Organizações: `OrganizationViewSet` em `/api/v1/admin/organizations/` commitado como
  **rascunho** (ADR 0032 = Proposto): expõe a rota ao usuário comum e acesso global ao
  superadmin. Revisar depois do Bloco 6; não tratar como concluído.
- 5.3 (admin de usuários/superadmins), 5.4 (área comum) e 5.5 (OpenAPI) pendentes.

## Avisos

- Superadmin local: `datasync_admin` (criado via `createsuperuser`; senha só com o usuário).
- Banco local até `audit.0005`; não regenerar migrations iniciais; `.env` nunca versionado.
- Managers exigem contexto de tenant; global só `unscoped()`/`system_context()`/`@system_scope`.
- `AuditEvent` imutável; `AccessLog` só eventos de autenticação (ADR 0019) — adequação ao
  Marco Civil não confirmada juridicamente.
- Antes de produção: cache compartilhado do limite de login, borda, MFA, `flushexpiredtokens`
  agendado, expurgo do `AccessLog` + `LegalHold` (ADR 0007), headers do proxy, criptografia
  de banco/backups, NTP.
- Push só quando o usuário pedir. Validador do backend via Git Bash
  (`PATH=/usr/bin:/bin:$PATH bash .ai/skills/validar-etapa/validar.sh`).
