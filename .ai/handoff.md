# Handoff

- **Atualizado em:** 2026-10-04
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Última alteração:** `refactor(api): separate general search from individual filters` (consultar git log -1)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 5.2 e revisão da busca geral concluídas |
| Próximo passo exato | 5.3: API administrativa de usuários/superadmins/admins de contrato, após confirmação |
| Aguardando o usuário? | sim — confirmar início da 5.3 |

## Concluído

0.1 · 0.2 · 1.1 · 0.3 · 1.2 · 2.1 · 2.2 · 3.1–3.6 · 2.3–2.5 · 4.1 e revisão · 5.1–5.2.

- CRUD /api/v1/admin/plans e contracts: somente superadmin ativo, sem organização.
  Listas limitadas/search/ordering/filtros, options/schema; organizations por contrato
  (organizações ativas, não excluídas), previsto na 3.5. UUIDs na API; erros RFC 9457.
- Camadas em apps/contracts: selectors/services/serializers/permissions/views/urls.
  django-filter 26.2: BaseFilterSet/backend em core/filters, FilterSets nos apps,
  filterset_class nas views. Filtros explícitos para não acessar managers na importação.
  Bases em core/views, mixins em core/mixins, paginação e permissões no core (ADR 0021);
  views declaram queryset diretamente, seguido de serializer_class/filterset_class;
  unscoped explícito e DRF padrão; selectors apenas para lógica própria de leitura
  (ADR 0028). Tenant contextual só na requisição. Exclusão via BaseModelService,
  PlanService/ContractService registrados por model no AppConfig.ready, sem SQL.
  Serializers declaram service_class; ServiceModelSerializer implementa create/update
  via service_class.save_instance, sem staticmethod nos recursos (ADR 0025);
  view usa serializer.save() padrão (ADR 0023). Regras/locks/auditoria preservados.
  Schemas: nomes de campos, labels/tipos do model e overrides por campo; options_url
  via SchemaRouter/reverse; ordenação via OrderingFilter. Sem queries (ADR 0026).
  general_search_fields/OR e filtros individuais/AND; schema general_search separado,
  lookups textuais explícitos, tenant preservado e sem casts/regex/M2M (ADR 0029).
  LookupOptionsMixin aceita options_permission_class; só administração usa
  SuperadminPermission, recursos comuns continuam :view/contexto. Docs/api atualizados.
- Licenças: usuário aprovou impedir redução abaixo dos não excluídos, contando
  inativos (ADR 0020). Lock no contrato como save_user; teste concorrente passou.
- Soft delete sem cascata; quotas sem enforcement; sem cobrança/aceite/assinatura.
  Plano excluído não selecionável, FK histórica continua e contrato pode ser editado.
- Escritas com autoria/AuditEvent atomicamente; antes/depois só configuração, sem
  nome do cliente. Falha da auditoria desfaz alteração. audit.0005 aplicada localmente.
- Leituras 1/30 itens: duas consultas de dados, sem writes, plano em JOIN sem N+1.
  Medição local JWT, 10 chamadas sequenciais: 30 contratos list/options 6,91/4,09 ms;
  10 mil 28,80/16,14 ms medianas. EXPLAIN ANALYZE avaliado; sem ensaio de concorrência
  de leitura/capacidade. Rever índices/busca/COUNT/OFFSET conforme volume real.
- Validação: suíte 477 + rodada dirigida 14 após novo teste M2M; cobertura total 478.
  Lint/formato/migrations e checks desenvolvimento/produção OK, sem migrations.
  OWASP A01–A10 revisada sem achados novos; base legal/CDC preservada, sem PII/
  dependências/telas/retentivos novos. ADR 0020, plano/docs/memória sincronizados.
  ADR 0021: bases compostas no core; preservar cabeçalho compacto/alinhado (fmt off/on).
  ADR 0022: django-filter substitui filter_listing; pip check/licença BSD-3 verificados.

## Falta / dúvidas

- Nada pendente na implementação 5.2. Aprovação da próxima etapa necessária.
- Models já usam verbose_name explícito nos rótulos; sem migrations pendentes.
- ADR 0019: AccessLog só login sucesso/falha e refresh sucesso; leituras não gravam.
  Cobertura jurídica escolhida precisa de validação antes de produção; não afirmar
  que apenas login satisfaz a lei. AuditEvent e entrada de superadmin preservados.

## Avisos

- Premissa GLOBAL forte de performance: queries/escritas/locks/CPU/memória/rede/
  concorrência; medir conforme risco. Queries constantes não bastam.
- Managers falham sem tenant; global só system_context()/@system_scope/unscoped().
  Views comuns TenantScopedViewMixin; model novo exige fábrica de isolamento.
- Escritas users/RBAC pelos services; AuditEvent imutável; leitura de auditoria
  deve filtrar contrato. A API administrativa usa acesso global autorizado explícito.
- Banco local aplicado até audit.0005; não regenerar initials nem versionar .env.
- Antes de produção: expurgo/LegalHold (ADR 0007), proxy configurado, sigilo/backups,
  NTP, cache compartilhado/atômico, borda, MFA/recuperação e limpeza de tokens.
- Push só quando solicitado; validador Windows via Git Bash com PATH=/usr/bin:/bin:$PATH.
