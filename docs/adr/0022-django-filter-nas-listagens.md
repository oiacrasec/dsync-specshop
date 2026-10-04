# 0022 — django-filter nas listagens

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADR 0021; substitui seu helper de filtragem genérica

## Contexto

Usuário determinou usar django-filter, como no Spatial. A composição de bases,
paginação e mixins já está no core; falta substituir filter_listing por FilterSets.

## Decisão

- Adotar django-filter 26.2 (BSD-3-Clause), com suporte verificado a Django 5.2 e
  Python 3.14 no [PyPI oficial](https://pypi.org/project/django-filter/26.2/).
- `core/filters.py`: BaseFilterSet e backend DRF com validação/normalização da
  entrada existente. `contracts/filters.py`: Plan/Contract/OrganizationFilterSet.
- Views declaram filterset_class. Filtros de situação, UUID de plano, busca e
  ordenação são declarados; nunca IDs internos ou campos livres recebidos do cliente.
- Filtros devem ser explícitos: geração automática por Meta.fields tenta acessar
  o manager durante importação, sem tenant. Não contornar fail closed nem alterar
  managers para viabilizar isso. UUID de plano usa UUIDFilter, sem queryset de FK.
- O selector fornece o queryset com escopo; FilterSet aplica filtros lazy;
  paginação executa COUNT/SELECT limitado. Leituras continuam sem writes/locks.
- Preservar first/rows, 422 RFC 9457, ordem estável por UUID, opções, schema e
  detalhes sem filtros da listagem. django_filters entra em INSTALLED_APPS.

## Consequências

- Remover filter_listing e AdminListQuerySerializer; validação comum em core.
- Biblioteca faz filtragem/validação de escolhas de ordenação/UUID; normalização
  de booleanos do contrato atual é preservada pelo backend.
- Filtros específicos do domínio ficam no app, sem migração ou alteração de escopo.
