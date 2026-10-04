# Handoff

- **Atualizado em:** 2026-10-03 21:10
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** 964d74a feat(rbac): add profiles and scoped assignments

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.3 Cálculo da permissão efetiva + permissão do DRF que nega por padrão — 🔄 em andamento |
| Próximo passo exato | desenhar a 3.3 a partir de `apps/rbac` e do registry; tirar dúvidas com o usuário antes de codificar |
| Aguardando o usuário? | não |

## Concluído na entrega 1

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1 · 3.2 (detalhes de cada etapa no plano e nos
commits). Ordem atual: 3.3 → 3.4 → 3.5 → 3.6 → 2.3 → 2.4 → 2.5 → 4.1 → bloco 5.

## Dúvidas abertas

- Nenhuma.

## Avisos

- **Ainda não há isolamento entre contratos:** os tipos de escopo não filtram queries
  (etapas 2.3–2.5). Não publicar endpoints de negócio antes delas.
- Banco local migrado, sem usuários. Não regenerar migrations iniciais já aplicadas.
- Autoria pode ser nula em operações de sistema; `bulk`/`update` exigem auditoria
  explícita. `all_objects` não dispensa autorização.
- Escritas de usuário passam por `save_user`; de RBAC, pelos services de `apps/rbac`.
- Antes de produção: cache compartilhado e atômico para o limite de login, proteção
  de borda, MFA/recuperação e `manage.py flushexpiredtokens` agendado diariamente.
- Expurgo e eliminação ficam em entrega própria (ADR 0007).
- `backend/.env` é local e nunca é versionado. Push só quando o usuário pedir.
- Validador no Windows: Git Bash com `PATH=/usr/bin:/bin:$PATH`.
