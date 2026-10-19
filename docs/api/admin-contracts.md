# Administração de planos e contratos

Etapa 5.2; ADRs 0004, 0008 e 0020. Todas as rotas exigem JWT de superadmin ativo.
Na 6.3, views/serializers/filters/URLs passaram a apps/administration; models
continuam em apps/contracts. Rotas e basenames preservados (ADR 0033).
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

Criação retorna 201; consultas/alterações 200; exclusão 204. Registros excluídos
nunca aparecem em listagens ou detalhes. Exclusão não remove dependentes nem
executa expurgo ou encerramento comercial. Inativos e contratos fora de vigência
continuam disponíveis na administração para suporte.

A área administrativa não tem rotas de organização (ADR 0037): a gestão fica na área do
cliente, e a escolha de organização pelo superadmin para suporte fica para depois.

## Provisionamento do contrato (6.6)

`POST /api/v1/admin/contracts/{public_id}/provision/` cria, numa única transação, a
primeira organização e o administrador do contrato (perfil essencial no escopo do
contrato), com senha temporária e `must_change_password=true` (decisões 38 e 42).

```json
{"organization_name": "Matriz", "username": "maria.silva", "name": "Maria"}
```

Resposta 201, com `Cache-Control: no-store`:

```json
{
  "organization": {"public_id": "...", "name": "Matriz"},
  "user": {"public_id": "...", "username": "maria.silva", "name": "Maria",
           "is_superuser": false, "must_change_password": true},
  "temporary_password": "<16 caracteres>"
}
```

| Situação | Resposta |
|---|---|
| Contrato inativo, vencido ou com início futuro | 409 [`contract-not-provisionable`](errors/contract-not-provisionable.md) |
| Contrato com usuário ou organização não excluídos (inclusive inativos) | 409 `contract-not-provisionable` |
| `username` em uso (inclusive por usuário excluído) ou entrada inválida | 422 `validation-error` |
| Contrato inexistente ou excluído | 404 |
| Não superadmin | 401/403 |

- Dados mínimos do admin: `username` (validador do Django, até 150) e `name`
  (`first_name`, até 150). Sem email/sobrenome até haver uso para eles (LGPD, necessidade).
- A senha temporária é gerada no servidor (CSPRNG, 16 caracteres) e passa pelos
  validadores do Django. Aparece **só** nesta resposta: não é gravada em claro, em
  log ou na auditoria. Login com ela exige a troca (ADR 0034).
- Auditoria na mesma transação: `assignment.created` (perfil essencial) e
  `contract.provisioned` com os UUIDs da organização e do admin. Falha em qualquer
  passo desfaz tudo.
- Locks: configuração RBAC (advisory) → contrato, a mesma ordem de `save_assignment`.
  Dois provisionamentos simultâneos do mesmo contrato resultam em um 201 e um 409.
- Custo: operação rara e fixa, 5 escritas e até 30 comandos de dados (reutiliza
  `save_user` e `save_assignment`), sem trabalho por item.

## Admins do contrato e reset de senha (6.7)

| Método | Rota | Resultado |
|---|---|---|
| GET | `/api/v1/admin/contracts/{public_id}/admins/` | admins do contrato, paginados (`first`/`rows`, máximo 100) |
| POST | `/api/v1/admin/contracts/{public_id}/admins/{user_public_id}/reset-password/` | 200, nova senha temporária |

Admin = usuário não excluído com atribuição do perfil essencial **ativa** (perfil ativo),
**incluindo usuários inativos** (decisão 43). Cada item: `public_id`, `username`, `name`,
`is_active`, `must_change_password`. Ordem por `username`; `{"data": [...], "total_records": n}`.

Reset (decisões 40 e 43):

```json
{"user": {"public_id": "...", "username": "maria.silva", "name": "Maria",
          "is_active": true, "must_change_password": true},
 "temporary_password": "<16 caracteres>"}
```

- Gera senha temporária (mesmo gerador do provisionamento), marca `must_change_password`
  e **revoga todos os refresh** pendentes da conta, na mesma transação. O access já emitido
  expira sozinho, mas a flag barra a navegação imediatamente (403 `password-change-required`).
- Senha só nesta resposta, `no-store`; evento `user.password_reset` guarda apenas a flag.
- Usuário fora da lista do contrato (comum, atribuição inativa, outro contrato, excluído,
  superadmin ou UUID desconhecido) → 404, sem revelar se existe. Admin inativo pode ser
  resetado: só entra quando for reativado.
- Locks: usuário → tokens, a mesma ordem do refresh (ver [autenticação](authentication.md)).
- Custo: lista com queries constantes (1/30 admins, EXISTS sem JOIN multiplicador, sem
  escritas); reset é operação rara, com 1 SELECT dos refresh pendentes e 1 INSERT em lote.

## Entrada e saída

Contract.plan é opcional: criação pode omitir o campo ou enviar null. Atualização
com null remove o vínculo; omissão preserva o plano atual. Respostas de contrato
sem plano retornam "plan": null. Plano selecionado exige UUID de plano não excluído;
licenças/validações de vigência e auditoria continuam aplicadas (ADR 0033).

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

`schema` retorna colunas com `field`/`label`/`type`, filtros com `field`/`label`/`type` e
`ordering_fields`. O filtro de relação `plan` tem `options_url` apontando para
`/api/v1/admin/plans/options/`. Documentação OpenAPI entra na etapa 5.5.
O `type` da coluna (`text`, `number`, `boolean`, `choice`, `date`, `datetime`, `relation`) vem do
campo do model, como nos filtros: é semântico e neutro de idioma. O cliente escolhe o formato
pelo locale (no Angular, `LOCALE_ID` pt-BR → `01/10/2026`).

O schema também retorna `general_search`, separado dos filtros individuais:

```json
{
  "parameter": "search",
  "label": "Busca geral",
  "fields": [{"field": "name", "label": "Nome", "lookup": "icontains"}]
}
```

O frontend usa esse bloco para um campo único; `filters` continua descrevendo os
controles individuais. General_search null indica busca desabilitada. Campos da
busca geral combinam com OR; filtros individuais e busca combinam com AND.
Nesta API continua pesquisa por trecho de name: não houve expansão para novos
campos ou mudança de parâmetros. Configuração no FilterSet via general_search_fields;
lookups específicos só por general_search_lookups explícito (ADR 0029).

## Auditoria e performance

Views de planos/contratos herdam `BaseAdminModelViewSet` e usam serializer.save()
do DRF. BaseAdminModelSerializer usa super().create/update com autoria e auditoria;
exclusão passa por SerializerDeleteMixin e serializer.delete(). Os serializers
declaram audit_fields/audit_events e regras próprias em validate(), sem full_clean
genérico nem lista adicional de campos para validar. Serviços genéricos e registro
no AppConfig.ready foram removidos (ADR 0030 substitui 0023–0025).
ATOMIC_REQUESTS mantém validação e gravação na mesma transação; a view adquire o
lock antes da validação de update/delete. Uso direto exige transaction.atomic
envolvendo is_valid/save; a base recarrega a instância com lock nesse caminho.
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
em `core/pagination.py`. Filtros são FilterSets django-filter de `administration/filters.py`,
com base/backend DRF em `core/filters.py`; consultas simples ficam no queryset da view.
O backend segue a [integração oficial com DRF](https://django-filter.readthedocs.io/en/stable/guide/rest_framework.html).

Escritas usam serializers com validação, autoria e AuditEvent na mesma transação.
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
