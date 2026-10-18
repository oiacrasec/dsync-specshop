# 0027 — Classes base de selectors e configuração das views

- **Status:** Substituído por 0028
- **Data:** 2026-10-04
- **Complementa:** ADRs 0002 e 0021

## Contexto

Usuário aprovou declarar a classe de selector na view, como a classe de service no
serializer, e determinou a ordem selector_class/serializer_class/filterset_class.

## Decisão

- BaseModelSelector no core declara model e select_related opcional. get_queryset
  retorna queryset lazy do manager com contexto atual e aplica somente JOINs declarados.
  Model não declarado falha; não inferir classes por convenção ou usar acesso global
  como fallback. Sem contexto o manager continua falhando fechado.
- BaseAdminModelSelector troca apenas o queryset inicial por objects.unscoped(),
  acesso global explícito para administração previamente autorizada.
- PlanSelector/ContractSelector substituem admin_plans/admin_contracts; Contract
  mantém select_related('plan'), sem queries extras para relações.
- SelectorQuerysetMixin usa selector_class.get_queryset. Classe padrão sem model
  falha explicitamente. Views administrativas mantêm SuperadminPermission.
- Views declaram sempre selector_class, serializer_class, filterset_class e depois
  as demais configurações. Não repetir staticmethod/hooks de delegação.

## Consequências

- Mesmas consultas, escopo, filtros, inativos e soft delete; sem queries na construção
  do queryset ou na importação. Sem mudanças de API, permissões ou migrations.
- Selectors específicos com parâmetros, como busca de organizações do contrato,
  permanecem funções nesta revisão; nenhuma migração indiscriminada dos apps.
