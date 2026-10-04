# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Última alteração:** `feat(api): add scoped lookup options mixin` (este handoff entra no commit; consultar git log -1)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 5.1 — ✅ concluída, conforme ADR 0011 |
| Próximo passo exato | 5.2: API administrativa de planos e contratos, após confirmação |
| Aguardando o usuário? | sim — confirmar início da 5.2 |

## Concluído

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1–3.6 · 2.3–2.5 · 4.1 e revisão · 5.1.

- LookupOptionsMixin em core/views; validação core/serializers, leitura core/selectors,
  permissão :view em rbac/permissions. Rótulo/campos SQL explícitos; queryset com escopo.
- UUID/rótulo somente; first/rows (20, máximo 100), public_id repetível até 100;
  resolução ignora q e inclui inativos. Soft deletes/fora do contexto nunca retornam.
  Paginação vale também na resolução. Restrições adicionais de permissão preservadas.
- Duas consultas de dados, sem model/__str__/serializer completo; JOIN em FK singular.
  Testes 1/30 itens: selector 2 queries, endpoint 7 operações SQL com force_authenticate,
  sem INSERT/UPDATE/DELETE. Busca textual, COUNT e OFFSET têm custo crescente:
  medir e analisar índices por recurso antes de publicar; sem benchmark de carga/JWT real.
- Nenhuma rota de produção, model, migration ou dependência nova. Docs sincronizadas;
  uso em docs/api/options.md. Não usar campos/relações multivaloradas como rótulo/busca.
- Validação: 407 testes, lint, formato, migrations e checks desenvolvimento/produção OK.
- OWASP A01–A10 revisada, sem achados novos; escopo, negação padrão, ORM parametrizado,
  limites e erros RFC 9457. Base legal preservada; sem novos dados pessoais/retentivos.

## Falta / dúvidas

- Nada pendente na implementação 5.1. Aprovação da próxima etapa ainda necessária.
- ADR 0019: AccessLog só login sucesso/falha e refresh sucesso; leituras não gravam.
  Cobertura jurídica escolhida precisa de validação antes de produção; não afirmar
  que apenas login satisfaz a lei. AuditEvent e entrada de superadmin preservados.

## Avisos

- Premissa GLOBAL forte de performance: queries/escritas/locks/CPU/memória/rede/
  concorrência; medir conforme risco. Queries constantes não bastam.
- Managers falham sem tenant; global só system_context()/@system_scope/unscoped().
  Views com TenantScopedViewMixin; model novo exige fábrica de isolamento.
- Escritas users/RBAC pelos services; AuditEvent imutável; leitura de auditoria
  deve filtrar contrato. Options exige a mesma :view do recurso, não :manage.
- Banco local com migrations aplicadas (audit.0004); não regenerar initials nem .env.
- Antes de produção: expurgo/LegalHold (ADR 0007), proxy configurado, sigilo/backups,
  NTP, cache compartilhado/atômico, borda, MFA/recuperação e limpeza de tokens.
- Push só quando solicitado; validador Windows via Git Bash com PATH=/usr/bin:/bin:$PATH.
