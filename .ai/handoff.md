# Handoff

- **Atualizado em:** 2026-10-03 21:40
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** 8b670a1 docs(ai): keep handoff as a short current-state snapshot (a etapa 3.3 entra no commit seguinte)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.3 Cálculo da permissão efetiva + DRF negando por padrão — ✅ concluída |
| Próximo passo exato | etapa 3.4: fixture do perfil essencial "Administrador do contrato" e proteção do último admin |
| Aguardando o usuário? | sim — aprovação para iniciar a 3.4 e confirmação de 2 decisões da 3.3 (abaixo) |

## Concluído na entrega 1

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1 · 3.2 · 3.3 (detalhes de cada etapa no plano e nos
commits). Ordem atual: 3.4 → 3.5 → 3.6 → 2.3 → 2.4 → 2.5 → 4.1 → bloco 5.

## Dúvidas abertas

- Organização **inativa** no header → 403 (implementado assim, falha fechada): confirmar.
- Exceção de organização **inativa** continua restringindo (falha fechada): confirmar.

## Avisos

- **Ainda não há isolamento entre contratos:** os tipos de escopo não filtram queries
  (etapas 2.3–2.5). Não publicar endpoints de negócio antes delas.
- Toda view nega por padrão: declarar `required_permission` ou `AllowAuthenticated`.
- Contrato vencido/inativo ainda **não** é checado a cada requisição (etapa 2.3).
- Banco local migrado, sem usuários. Não regenerar migrations iniciais já aplicadas.
- Autoria pode ser nula em operações de sistema; `bulk`/`update` exigem auditoria
  explícita. `all_objects` não dispensa autorização.
- Escritas de usuário passam por `save_user`; de RBAC, pelos services de `apps/rbac`.
- Antes de produção: cache compartilhado e atômico para o limite de login, proteção
  de borda, MFA/recuperação e `manage.py flushexpiredtokens` agendado diariamente.
- Expurgo e eliminação ficam em entrega própria (ADR 0007).
- `backend/.env` é local e nunca é versionado. Push só quando o usuário pedir.
- Validador no Windows: Git Bash com `PATH=/usr/bin:/bin:$PATH`.
