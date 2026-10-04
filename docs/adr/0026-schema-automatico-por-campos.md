# 0026 — Schema por campos, metadados automáticos e overrides

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADRs 0004, 0021 e 0022

## Contexto

Usuário pediu informar somente campos do model no schema de filtros/colunas,
como no Spatial, com labels/tipos/URL automáticos e sobrescritas específicas.
Também apontou duplicação de ordering_fields entre view e OrderingFilter.

## Decisão

- schema_columns/schema_filters contêm nomes de campos explicitamente publicados.
  Não gerar metadata de todos os campos nem alterar os FilterSets existentes.
- Labels vêm de verbose_name com capitalização inicial; tipos de filtros vêm
  do campo do model. schema_column_overrides/schema_filter_overrides sobrescrevem
  somente metadados escolhidos por campo. is_active permanece filtro comum.
- Filtro publicado deve existir no FilterSet. Campos desconhecidos, relações
  multivaloradas e tipos sem suporte falham explicitamente como configuração inválida.
- SchemaRouter registra metadados por model do serializer/basename do endpoint
  options. URL resolvida com reverse no namespace atual; sem concatenar app/model.
  No mesmo router só uma rota options por model. Relações fora dele ou sem rota
  exigem options_url em override; nenhuma URL é adivinhada.
- ordering_fields da resposta vem do OrderingFilter do FilterSet. Remover
  declaração duplicada da view e do mixin de listagem.
- Model/schema usam metadados, sem instanciar filtros/serializers ou avaliar querysets.
  Permissões da view/schema e de cada endpoint options continuam independentes.

## Consequências

- Views declaram campos e exceções; labels/model, ordenação/FilterSet e URLs/router
  são suas respectivas fontes de verdade.
- Preservados formato da API, campos, labels atuais, rotas e permissões.
  Início continua override, evitando alteração do contrato existente.
- Zero consultas para geração de schema; registro de rotas ocorre na inicialização
  do URLconf. Sem escritas, novos locks, dependências ou migrations.
