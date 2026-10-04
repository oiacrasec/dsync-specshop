# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Última alteração:** `refactor(api): use DRF serializers for audited CRUD` (consultar git log -1)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 5.2 e revisão dos serializers concluídas |
| Próximo passo exato | 5.3: API administrativa de usuários/superadmins/admins de contrato |
| Aguardando o usuário? | sim — confirmar início da 5.3 |

## Concluído

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1–3.6 · 2.3–2.5 · 4.1 · 5.1–5.2 e revisões.

- CRUD /api/v1/admin/plans e contracts: superadmin ativo, sem organização.
  UUIDs externos, erros RFC 9457; lists/options/schema, organizações por contrato.
- Views: queryset, serializer_class, filterset_class e demais configurações nessa ordem.
  Consultas simples diretamente na view; selectors só para lógica própria (ADR 0028).
  django-filter, general_search_fields OR e filtros individuais AND; schema separado,
  metadados do model e overrides por campo, options_url via SchemaRouter (0026/0029).
- ADR 0030 substitui 0023–0025: BaseModelSerializer/BaseAdminModelSerializer usam
  super().create/update, autoria/auditoria atômica e create_extra/update_extra.
  Campos validados pelo DRF; regras próprias no validate(). Usuário dispensou
  full_clean genérico e model_validation_fields/exclude. Plan/Contract services,
  BaseModelService e registry removidos; services próprios de users/RBAC preservados.
- ATOMIC_REQUESTS engloba validação/gravação. View adquire lock antes de validar
  update/delete; serializer reutiliza. Uso direto exige atomic envolvendo is_valid/save,
  recarrega estado atual com lock. instance_locked é contexto interno da view.
  SerializerDeleteMixin chama serializer.delete(): soft delete, sem cascata.
- Licenças contam inativos e ativos não excluídos; redução não pode ficar abaixo
  desse total. Mesmo lock de contrato do cadastro de usuários; concorrência testada.
  Plano excluído não selecionável, mas FK histórica permanece e contrato é editável.
- audit_fields/audit_events explícitos; auditoria sem nomes de clientes/senhas/tokens.
  Falha da auditoria desfaz create/update/delete. Ajustes extras também auditados.
- Validador: 478 testes + lint/formato/migrations/checks dev/produção passaram.
  Depois, três casos novos de hooks/rollback; rodada dirigida 51 passou (481 total).
  OWASP A01–A10 revisadas, sem achados novos; sem migrations/dependências novas.
- Leituras sem writes/locks, plano em JOIN sem N+1. Lock de escrita só no registro
  e plano recebido; COUNT de usuários só na redução. Sem ensaio de carga novo.
- Models: verbose_name explícito e limite 120. Preservar cabeçalho compacto da
  view base e audit_events multiline ajustado pelo usuário (fmt off/on local).
- LoginSerializer sem style HTML; write_only e espaços preservados. OpenAPI na 5.5.

## Pendências / avisos

- 5.3 não iniciada. Quotas do Plan só schema, sem enforcement/cobrança/assinatura.
- Performance é premissa GLOBAL: banco/locks/CPU/memória/rede/concorrência;
  consultas constantes não garantem capacidade. Medir conforme risco e volume real.
- Managers exigem tenant; global só unscoped()/system_context()/@system_scope.
  Models novos exigem fábrica de isolamento; AuditEvent imutável.
- AccessLog só login sucesso/falha e refresh sucesso (ADR 0019), sem leituras comuns;
  cobertura jurídica exige validação antes de produção, não afirmar suficiência legal.
- Banco local aplicado até audit.0005; não regenerar initials nem versionar .env.
- Antes de produção: expurgo/LegalHold, proxy, sigilo/backups, NTP, cache compartilhado,
  proteção de borda, MFA/recuperação e limpeza de tokens. Push só quando solicitado.
- Validador Windows via Git Bash: PATH=/usr/bin:/bin:$PATH.
