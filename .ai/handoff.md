# Handoff

- **Atualizado em:** 2026-10-03 23:00
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** etapa 3.5 (`feat(rbac): list accessible organizations`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.5 Organizações acessíveis + busca do superadmin — ✅ concluída |
| Próximo passo exato | etapa 3.6: auditoria das mudanças de permissão e das entradas do superadmin em organização |
| Aguardando o usuário? | sim — aprovação para iniciar a 3.6 |

## Concluído na entrega 1

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1 · 3.2 · 3.3 · 3.4 · 3.5 (detalhes de cada etapa no plano e nos
commits). Ordem atual: 3.6 → 2.3 → 2.4 → 2.5 → 4.1 → bloco 5.

## Dúvidas abertas

- Nenhuma.

## Avisos

- **Ainda não há isolamento entre contratos:** os tipos de escopo não filtram queries
  (etapas 2.3–2.5). Não publicar endpoints de negócio antes delas. Único publicado:
  `GET /api/v1/me/organizations/` (filtro explícito pelo usuário; superadmin → lista vazia).
- Toda view nega por padrão: declarar `required_permission` ou `AllowAuthenticated`.
- Contrato vencido/inativo ainda **não** é checado a cada requisição (etapa 2.3).
- Banco local migrado (inclui rbac.0002 com o perfil essencial), sem usuários. Não regenerar migrations iniciais já aplicadas.
- Autoria pode ser nula em operações de sistema; `bulk`/`update` exigem auditoria
  explícita. `all_objects` não dispensa autorização.
- Escritas de usuário passam por `save_user`/`delete_user` (`user.save()`, `user.delete()` e lote delegam a eles; só `update`/`bulk_*` pulam as regras); de RBAC, pelos services de `apps/rbac`.
- Antes de produção: cache compartilhado e atômico para o limite de login, proteção
  de borda, MFA/recuperação e `manage.py flushexpiredtokens` agendado diariamente.
- Expurgo e eliminação ficam em entrega própria (ADR 0007).
- `backend/.env` é local e nunca é versionado. Push só quando o usuário pedir.
- Validador no Windows: Git Bash com `PATH=/usr/bin:/bin:$PATH`.
