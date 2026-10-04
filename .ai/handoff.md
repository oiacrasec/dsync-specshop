# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** etapa 2.4 (`feat(tenancy): add fail-closed scoped managers and tenant context`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 2.4 Proteção em camadas B a E — ✅ concluída |
| Próximo passo exato | aplicar as migrations só de estado no banco local (autorização) e iniciar a 2.5: testes de isolamento genéricos (camada F) |
| Aguardando o usuário? | sim — autorizar contracts.0002, rbac.0003, users.0003, audit.0002 (sem SQL) e aprovar a 2.5 |

## Concluído na entrega 1

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1 · 3.2 · 3.3 · 3.4 · 3.5 · 2.3 · 3.6 · 2.4. Ordem atual:
2.5 → 4.1 → bloco 5.

## Dúvidas abertas

- Nenhuma (403 para contrato excluído confirmado pelo usuário).

## Avisos

- **Isolamento entre contratos:** managers filtram pelo contexto e falham sem ele (2.4);
  testes genéricos de isolamento na 2.5. Não publicar endpoints de negócio antes delas. Único publicado:
  `GET /api/v1/me/organizations/` (filtro explícito pelo usuário; superadmin → lista vazia).
- Queries fora de requisição: `system_context()`/`@system_scope` ou `.unscoped()` explícito; nunca `queryset` de classe em view.
- `AuditEvent` é Hybrid: ao ler pela API (bloco 5), filtrar sempre pelo contrato (eventos do sistema = contas de superadmin).
- Toda view nega por padrão: declarar `required_permission` ou `AllowAuthenticated`.
- Contrato indisponível → 403 `contract-inactive` no login, refresh e toda rota autenticada (2.3).
- Superadmin entra em organização pelo header (qualquer contrato não excluído); a entrada é auditada (3.6).
- Banco local com audit.0001; **sem** as migrations só de estado da 2.4 (aguardam autorização). Sem usuários. Não regenerar migrations iniciais já aplicadas.
- Autoria pode ser nula em operações de sistema; `bulk`/`update` exigem auditoria
  explícita. `all_objects` não dispensa autorização.
- Eventos de auditoria são imutáveis; services de RBAC e contas de superadmin auditam (ADR 0017).
- Escritas de usuário passam por `save_user`/`delete_user` (`user.save()`, `user.delete()` e lote delegam a eles; só `update`/`bulk_*` pulam as regras); de RBAC, pelos services de `apps/rbac`.
- Antes de produção: cache compartilhado e atômico para o limite de login, proteção
  de borda, MFA/recuperação e `manage.py flushexpiredtokens` agendado diariamente.
- Expurgo e eliminação ficam em entrega própria (ADR 0007).
- `backend/.env` é local e nunca é versionado. Push só quando o usuário pedir.
- Validador no Windows: Git Bash com `PATH=/usr/bin:/bin:$PATH`.
