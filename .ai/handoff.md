# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** etapa 2.3 (`feat(context): check contract on every request and allow superadmin organization context`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 2.3 Resolução do contexto — ✅ concluída |
| Próximo passo exato | etapa 3.6: auditoria das mudanças de permissão e das entradas do superadmin em organização |
| Aguardando o usuário? | sim — aprovação para a 3.6 e confirmar: superadmin em contrato **excluído** → 403 |

## Concluído na entrega 1

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1 · 3.2 · 3.3 · 3.4 · 3.5 · 2.3. Ordem atual:
3.6 → 2.4 → 2.5 → 4.1 → bloco 5.

## Dúvidas abertas

- Superadmin em organização de contrato excluído: implementado 403 (fail closed), falta confirmação do usuário.

## Avisos

- **Ainda não há isolamento entre contratos:** os tipos de escopo não filtram queries
  (etapas 2.4–2.5). Não publicar endpoints de negócio antes delas. Único publicado:
  `GET /api/v1/me/organizations/` (filtro explícito pelo usuário; superadmin → lista vazia).
- Toda view nega por padrão: declarar `required_permission` ou `AllowAuthenticated`.
- Contrato indisponível → 403 `contract-inactive` no login, refresh e toda rota autenticada (2.3).
- Superadmin entra em organização pelo header (qualquer contrato não excluído); **auditoria dessa entrada ainda não existe (3.6)**.
- Banco local migrado (inclui rbac.0002 com o perfil essencial), sem usuários. Não regenerar migrations iniciais já aplicadas.
- Autoria pode ser nula em operações de sistema; `bulk`/`update` exigem auditoria
  explícita. `all_objects` não dispensa autorização.
- Escritas de usuário passam por `save_user`/`delete_user` (`user.save()`, `user.delete()` e lote delegam a eles; só `update`/`bulk_*` pulam as regras); de RBAC, pelos services de `apps/rbac`.
- Antes de produção: cache compartilhado e atômico para o limite de login, proteção
  de borda, MFA/recuperação e `manage.py flushexpiredtokens` agendado diariamente.
- Expurgo e eliminação ficam em entrega própria (ADR 0007).
- `backend/.env` é local e nunca é versionado. Push só quando o usuário pedir.
- Validador no Windows: Git Bash com `PATH=/usr/bin:/bin:$PATH`.
