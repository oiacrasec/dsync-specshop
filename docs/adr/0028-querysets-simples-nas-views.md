# 0028 — Querysets administrativos simples diretamente nas views

- **Status:** Aceito
- **Data:** 2026-10-04
- **Substitui:** ADR 0027
- **Complementa:** ADRs 0002 e 0021

## Contexto

Usuário considerou selector_class complexo e preferiu a montagem de queryset do
Spatial. Determinou declarar queries simples diretamente no queryset da view,
sem classe ou função de selector apenas para repetir uma consulta simples.

## Decisão

- Views declaram Plan.objects.unscoped() e Contract.objects.unscoped().select_related('plan'),
  com acesso global explícito, preservando soft delete/inativos e JOIN do plano.
- Queryset é declarado diretamente na view administrativa, seguido
  de serializer_class, filterset_class e demais configurações.
- Usar get_queryset padrão do DRF, que clona o queryset por requisição. Remover
  SelectorQuerysetMixin, BaseModelSelector/BaseAdminModelSelector e selector_class.
- Construção do queryset é lazy, sem SQL ou avaliação na declaração. Administração
  continua protegida por SuperadminPermission, sem contexto organizacional.
- Selectors com contexto de tenant devem ser chamados durante a requisição:
  não chamar managers dependentes de contexto na importação/declarar queryset
  contextual na classe. TenantScopedViewMixin e managers continuam falhando fechado.

## Consequências

- Selectors ficam para consultas com lógica própria, sem wrappers de queries simples.
- Mesmas consultas, JOINs, permissões, filtros e contratos de API; sem migrations.
- Consulta global só nos recursos administrativos explicitamente autorizados;
  essa declaração de queryset não se aplica automaticamente aos recursos de tenant.
