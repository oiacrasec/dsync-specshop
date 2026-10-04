# Handoff

- **Atualizado em:** 2026-10-03 23:00
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** etapa 3.4 (`feat(rbac): seed essential profile and protect last contract admin`)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.4 Perfil essencial + proteção do último administrador — ✅ concluída |
| Próximo passo exato | etapa 3.5: lista de organizações acessíveis + busca contrato → organização do superadmin |
| Aguardando o usuário? | sim — aprovação para iniciar a 3.5 |

## Concluído na entrega 1

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1 · 3.2 · 3.3 · 3.4 (detalhes de cada etapa no plano e nos
commits). Ordem atual: 3.5 → 3.6 → 2.3 → 2.4 → 2.5 → 4.1 → bloco 5.

## Dúvidas abertas

- Nenhuma.

## Avisos

- **Ainda não há isolamento entre contratos:** os tipos de escopo não filtram queries
  (etapas 2.3–2.5). Não publicar endpoints de negócio antes delas.
- Toda view nega por padrão: declarar `required_permission` ou `AllowAuthenticated`.
- Contrato vencido/inativo ainda **não** é checado a cada requisição (etapa 2.3).
- Banco local migrado (inclui rbac.0002 com o perfil essencial), sem usuários. Não regenerar migrations iniciais já aplicadas.
- Autoria pode ser nula em operações de sistema; `bulk`/`update` exigem auditoria
  explícita. `all_objects` não dispensa autorização.
- Escritas de usuário passam por `save_user`/`delete_user` (`user.delete()` e lote delegam ao `delete_user`; `user.save()` direto ainda pula as regras); de RBAC, pelos services de `apps/rbac`.
- Antes de produção: cache compartilhado e atômico para o limite de login, proteção
  de borda, MFA/recuperação e `manage.py flushexpiredtokens` agendado diariamente.
- Expurgo e eliminação ficam em entrega própria (ADR 0007).
- `backend/.env` é local e nunca é versionado. Push só quando o usuário pedir.
- Validador no Windows: Git Bash com `PATH=/usr/bin:/bin:$PATH`.
