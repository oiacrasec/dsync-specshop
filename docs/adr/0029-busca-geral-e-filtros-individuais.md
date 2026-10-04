# 0029 — Busca geral e filtros individuais no Core

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADRs 0022 e 0026

## Contexto

Usuário pediu adaptar general_search_fields do Spatial para separar a busca única
dos filtros com controles individuais, com qualidade e atenção à performance.
O Core já tinha search_fields para OR textual, sem metadata de busca geral no schema.

## Decisão

- BaseFilterSet usa general_search_fields (padrão vazio). Plan/ContractFilterSet
  declaram name; OrganizationFilterSet herda a configuração. Parâmetro continua search.
- Texto combina campos com OR; filtros individuais combinam com AND e preservam
  seus lookups próprios. Não copiar automaticamente lookup do filtro individual.
- icontains é padrão; general_search_lookups declara alterações por campo usando
  lista fechada de lookups textuais. Regex/casts de UUID/números/datas não permitidos.
- Somente CharField/TextField e subclasses; caminhos por FK/OneToOne diretas,
  sem relações multivaloradas/reversas. Sem distinct para mascarar duplicações.
  Configuração inválida falha; texto vazio ou ausência de campos não altera o queryset.
- Schema adiciona general_search com parameter/label/fields(field/label/lookup),
  ou null quando desabilitado. filters permanece separado para controles individuais.
  Participar da busca geral não remove um filtro individual nem altera seu significado.
- Metadados usam somente model/FilterSet; nenhuma avaliação do queryset. A busca
  aplica condições ao queryset recebido, preservando tenant, soft delete e paginação.
- options_search_fields/q continua exclusivo das seleções, sem mudança de contrato.

## Consequências

- Frontend distingue o campo único dos filtros individuais com metadata explícita.
- Schema ganha chave nova; demais parâmetros/campos/labels e busca por name preservados.
- Sem SQL bruto, novas queries por item, escritas incidentais, locks ou migrations.
  Novos campos/JOINs de busca exigem revisão de performance antes de habilitar.
- O modelo automático de placement do Spatial não foi copiado: um campo pode ser
  pesquisável e ter controle individual ao mesmo tempo, sem ocultá-lo por inferência.
