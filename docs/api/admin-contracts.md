# Administração de planos e contratos

Etapa 5.2; ADRs 0004, 0008 e 0020. Todas as rotas exigem JWT de superadmin ativo.
Usuário comum recebe 403, ausência de autenticação 401. Não exigem nem usam
`X-Organization-Id`, mesmo quando enviado. UUID inválido/desconhecido no caminho
retorna 404; validação 422, sempre no formato [RFC 9457](errors.md).

| Método | Rota | Resultado |
|---|---|---|
| GET / POST | `/api/v1/admin/plans/` | listar / criar plano |
| GET / PUT / PATCH / DELETE | `/api/v1/admin/plans/{public_id}/` | consultar / substituir / alterar / excluir logicamente |
| GET / POST | `/api/v1/admin/contracts/` | listar / criar contrato |
| GET / PUT / PATCH / DELETE | `/api/v1/admin/contracts/{public_id}/` | consultar / substituir / alterar / excluir logicamente |
| GET | `/api/v1/admin/{plans,contracts}/options/` | seleção UUID/rótulo conforme [options](options.md) |
| GET | `/api/v1/admin/{plans,contracts}/schema/` | columns, filters, ordering_fields para a tabela |
| GET | `/api/v1/admin/contracts/{public_id}/organizations/` | organizações ativas e não excluídas desse contrato, para entrada do superadmin |

Criação retorna 201; consultas/alterações 200; exclusão 204. Registros excluídos
nunca aparecem em listagens ou detalhes. Exclusão não remove dependentes nem
executa expurgo ou encerramento comercial. Inativos e contratos fora de vigência
continuam disponíveis na administração para suporte.

## Entrada e saída

Plan: `name`, `max_organizations`, `max_storage_bytes`, `max_integrations`,
`max_operations_per_month`, `is_active`. Quotas aceitam null ou inteiros não
negativos; continuam sem enforcement. Contrato: `name`, `plan` (UUID público),
`start_date`, `end_date`, `licenses`, `post_termination_retention_days`, `is_active`.
Datas ISO 8601; fim nulo ou posterior/igual ao início; licenças >= 1; retenção 0–365,
padrão 90. Todos os campos seguem [domínio de contratos](../domain/contracts.md).

Saída inclui `public_id`, `created_at`, `updated_at`; esses campos são somente
leitura. IDs internos/autoria/deleted_at/contexto não entram no payload da API.
Campos não declarados ou somente leitura são ignorados pelo serializer DRF.
PATCH valida o resultado combinado com o estado atual bloqueado, incluindo datas.

Reduzir licenças abaixo dos usuários não excluídos, inclusive inativos, retorna 422
em `errors.licenses`. Uma nova vaga e uma redução concorrentes respeitam o mesmo
lock do contrato. Plano excluído não é selecionável; plano inativo pode ser resolvido
por UUID e permanece válido conforme a persistência atual. Contratos históricos
com plano excluído continuam consultáveis/editáveis, sem cascata.

## Listagens e schema

`first` >= 0, `rows` de 1 a 100 (padrão 20), `search` por trecho do nome (até 255
caracteres), `is_active` opcional e `ordering` (até 100 caracteres, separado por
vírgula, `-` para ordem descendente). Ordem padrão nome, com UUID como desempate.
Resposta: `{"data": [...], "total_records": 57}`.

Planos permitem ordenar por `name`, `created_at`, `updated_at`; contratos também
por `start_date`, `end_date`, `licenses`, e filtrar por `plan` (UUID). Organizações
permitem ordenar apenas por `name`; são limitadas ao contrato da URL e ativas.
Filtros/ordenações desconhecidos não são interpolados em SQL. Campo de ordenação
fora da lista e filtro `plan` em recurso incompatível retornam 422. Parâmetros
desconhecidos são ignorados, sem criar filtros dinâmicos.

`schema` retorna colunas com `field`/`label`, filtros com `field`/`label`/`type` e
`ordering_fields`. O filtro de relação `plan` tem `options_url` apontando para
`/api/v1/admin/plans/options/`. Documentação OpenAPI entra na etapa 5.5.

## Auditoria e performance

Views de planos/contratos herdam `BaseAdminModelViewSet` e usam serializer.save()
do DRF. ServiceModelSerializer.create/update chamam service_class.save_instance;
exclusão continua em ServiceDeleteMixin, usando BaseModelService da view base.
PlanService/ContractService herdam exclusão comum e definem gravação/autorização/
auditoria; registro explícito no AppConfig.ready, sem queries na inicialização.
Cada recurso declara queryset/schema; serializer declara service_class (ADR 0025).
Consultas simples são declaradas no queryset da view, com unscoped
explícito e select_related('plan') para contratos. DRF clona o queryset
lazy por requisição; select_related do plano preservado, sem SQL na construção
(ADR 0028 substitui as classes da revisão anterior).
essa refatoração não altera rotas, payloads, permissões ou regras de negócio.
Colunas/filtros do schema informam nomes de campos: label vem do verbose_name,
tipo do model e options_url das rotas options registradas pelo SchemaRouter,
usando reverse. Overrides por campo preservam labels específicos ("Início").
ordering_fields vem do OrderingFilter do FilterSet, sem duplicação na view.
Geração usa metadados, sem queries; lista explícita preserva campos/ordem (ADR 0026).
As bases ficam em `core/views.py`, comportamentos em `core/mixins.py` e paginação
em `core/pagination.py`. Filtros são FilterSets django-filter de `contracts/filters.py`,
com base/backend DRF em `core/filters.py`; selectors fornecem o queryset do domínio.
O backend segue a [integração oficial com DRF](https://django-filter.readthedocs.io/en/stable/guide/rest_framework.html).

Escritas usam services com validação, autoria e AuditEvent na mesma transação.
Eventos `plan.created/updated/deleted` e `contract.created/updated/deleted` guardam
configuração antes/depois, UUID, ator e data, sem nomes de clientes. Alterar apenas
nome continua gerando evento do alvo, sem copiar seu texto para o JSON.
Falha da auditoria desfaz a alteração. Migration audit.0005 adiciona as escolhas.

Listas/options: duas consultas de dados com 1 e 30 itens; plano do contrato usa
JOIN, sem N+1. Páginas materializam no máximo 100 registros, leituras não gravam
AccessLog/AuditEvent nem adquirem locks explícitos. Escritas bloqueiam somente o
registro afetado e o plano recebido, quando necessário. Contagem de usuários só
ocorre na redução de licenças, no banco, usando o índice da FK do contrato.
Busca por trecho, contagem exata e offsets têm custo crescente com os dados;
contagem constante de queries não certifica capacidade em produção.

Medição local em 2026-10-04, PostgreSQL, JWT real, 10 requisições sequenciais por
cenário, página de 20 com busca abrangente pelo nome: com 30 contratos, mediana
de 6,91 ms na listagem e 4,09 ms em options; com 10.000 contratos, 28,80 ms e
16,14 ms. EXPLAIN ANALYZE: COUNT/página em 4,70/17,78 ms na listagem maior e
4,69/7,51 ms em options. Dados sintéticos em banco de testes, sem gravação no
banco local. É uma medição exploratória de custo, sem concorrência, metas de
latência ou garantia de capacidade. Busca/contagem crescem com o volume;
avaliar índices específicos e carga conforme o volume real antes de produção.
