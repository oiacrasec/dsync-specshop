# 0021 — Views base compostas no core

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADRs 0002, 0004, 0011 e 0020
- **Revisões:** 2026-10-23 — `BaseAPIView` e `BaseSerializer` obrigatórias, com teste-trava (decisão 82)

## Contexto

Usuário prefere a organização do Spatial: bases no core, paginação própria e
comportamentos separados em mixins, reutilizados pelos apps de domínio.

## Decisão

- `core/views.py`: composição de `BaseModelViewSet` e `BaseAdminModelViewSet`,
  além do fallback da API. A base administrativa exige superadmin sem organização;
  a base comum preserva as permissões globais de negação por padrão.
- `core/mixins.py`: selectors, services, filtros, options, schema e o mixin de
  escopo existente. Configuração de recursos continua explícita, sem inferir
  permissões/campos/services pelo nome do model.
- `core/pagination.py`: `StandardResultsSetPagination`, first/rows, padrão 20,
  máximo 100 e 422 na entrada inválida. Offset exato, inclusive quando não é
  múltiplo do tamanho da página; resposta data/total_records.
- `core/permissions.py`: autorização administrativa compartilhada.
- `core/selectors.py`: filtragem/ordenação genérica de queryset lazy; paginação
  executa COUNT e SELECT limitado. Preservar escopo e evitar consultas por item.
- Apps de domínio declaram serializer/selector/services/schema e ações próprias.
  Regras, locks, autoria e auditoria continuam nos services.
- **Bases obrigatórias (revisão de 2026-10-23):** toda `APIView` herda `BaseAPIView` e todo
  serializer sem model herda `BaseSerializer` (`core/views.py`, `core/serializers.py`); nunca
  `APIView` ou `serializers.Serializer` direto (teste `test_base_classes.py`). A `BaseAPIView`
  responde `no-store` por padrão, inclusive em erro (`no_store = False` só para quem define o
  próprio Cache-Control, como o download de mídia), aceita JSON por padrão (`UPLOAD_PARSERS` para
  multipart) e não libera permissão. As bases explicam-se em comentário, não em docstring, para a
  docstring não ser herdada como descrição das rotas no OpenAPI.

## Consequências

- Bases se reutilizam entre apps, com cabeçalho compacto e continuação alinhada,
  conforme ajuste manual do usuário. Mixins não concentram regras de negócio.
- Contratos e planos usam a composição sem mudar o contrato público, permissões,
  auditoria ou custo de queries. Organização do Spatial adaptada aos ADRs do Core.
- Não adicionar componentes de cache, descoberta automática ou dependências sem
  necessidade demonstrada pelo domínio.
