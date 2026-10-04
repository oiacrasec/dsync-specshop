# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** etapa 3.6 (`feat(audit): add append-only audit trail for access changes`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.6 Auditoria (ADR 0017, `apps/audit`) — ✅ concluída |
| Próximo passo exato | aplicar `audit.0001` no banco local (autorização do usuário) e iniciar a 2.4: proteção em camadas B a E |
| Aguardando o usuário? | sim — autorizar a migration `audit.0001` no banco local e aprovar a 2.4 |

## Concluído na entrega 1

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1 · 3.2 · 3.3 · 3.4 · 3.5 · 2.3 · 3.6. Ordem atual:
2.4 → 2.5 → 4.1 → bloco 5.

## Dúvidas abertas

- Nenhuma (403 para contrato excluído confirmado pelo usuário).

## Avisos

- **Ainda não há isolamento entre contratos:** os tipos de escopo não filtram queries
  (etapas 2.4–2.5). Não publicar endpoints de negócio antes delas. Único publicado:
  `GET /api/v1/me/organizations/` (filtro explícito pelo usuário; superadmin → lista vazia).
- Toda view nega por padrão: declarar `required_permission` ou `AllowAuthenticated`.
- Contrato indisponível → 403 `contract-inactive` no login, refresh e toda rota autenticada (2.3).
- Superadmin entra em organização pelo header (qualquer contrato não excluído); a entrada é auditada (3.6).
- Banco local migrado até rbac.0002, **sem audit.0001** (aguarda autorização), sem usuários. Não regenerar migrations iniciais já aplicadas.
- Autoria pode ser nula em operações de sistema; `bulk`/`update` exigem auditoria
  explícita. `all_objects` não dispensa autorização.
- Eventos de auditoria são imutáveis; services de RBAC e contas de superadmin auditam (ADR 0017).
- Escritas de usuário passam por `save_user`/`delete_user` (`user.save()`, `user.delete()` e lote delegam a eles; só `update`/`bulk_*` pulam as regras); de RBAC, pelos services de `apps/rbac`.
- Antes de produção: cache compartilhado e atômico para o limite de login, proteção
  de borda, MFA/recuperação e `manage.py flushexpiredtokens` agendado diariamente.
- Expurgo e eliminação ficam em entrega própria (ADR 0007).
- `backend/.env` é local e nunca é versionado. Push só quando o usuário pedir.
- Validador no Windows: Git Bash com `PATH=/usr/bin:/bin:$PATH`.
