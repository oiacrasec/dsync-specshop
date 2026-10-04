# Estilo dos models Django

Padrão obrigatório definido pelo usuário para os models do backend. Exemplo de
referência: [models](../examples/model.md). Implementações atuais:
`apps/core/models.py` e `apps/users/models.py`.

## Declaração de campos

- Manter campos curtos e seus argumentos na mesma linha, até **120 caracteres**.
- Declarar rótulos com `verbose_name=_('...')`, nunca como argumento posicional,
  mesmo nos campos que aceitam a forma abreviada.
- Em declarações longas, agrupar vários argumentos por linha e alinhar a
  continuação aos argumentos da chamada, seguindo o exemplo de referência.
- Fechar a chamada na linha do último argumento, preservando a vírgula final
  nas declarações de relações conforme o exemplo.
- Aplicar a mesma organização a campos novos e aos existentes quando alterados.
  Expressões curtas nos métodos também permanecem compactas.
- Manter linhas em branco entre métodos e classes; a organização compacta não
  altera a separação das responsabilidades.

## Organização dos módulos

Convenção definida pelo usuário:

| Arquivo | Contém |
|---|---|
| `models.py` | só models (e o metaclass do BaseModel) |
| `managers.py` | querysets e managers |
| `middleware.py` | só classes de middleware |
| `utils.py` | funções auxiliares do app, sem regra de negócio e sem escrita no banco |
| `services.py` / `selectors.py` | operações próprias de domínio / leituras; CRUD auditado nos serializers |
| `exceptions.py` | só classes de exceção |
| `queries/<nome>.py` | uma query SQL escrita à mão por arquivo, como constante ([regras](#queries-sql-escritas-à-mão)) |
| `constants.py` | constantes do app: só valores literais (texto, número, regex, mensagem traduzível), sem importar código do próprio app |
| módulo temático (ex.: `problems.py`) | bloco grande de um único tema, para o `utils.py` não virar gaveta |

Ficam fora do `constants.py`, por motivo técnico: objetos do próprio módulo (ex.:
`TenantContext` do sistema, `NO_ACCESS`), sentinelas privadas, tuplas de classes
(`SCOPE_TYPES`), o catálogo `PERMISSIONS` e as constantes do `permission_registry`
(Python puro por ADR 0009) e os literais das migrations (migration não importa o app).
Testes mantêm literais do contrato da API (ex.: `application/problem+json`) para não
validar a constante contra ela mesma.

Não misturar auxiliares no módulo do middleware (ex.: `apps/audit/utils.py` marca a
entrada do superadmin; `apps/audit/middleware.py` só grava).

## Queries SQL escritas à mão

Primeiro tente o ORM (`annotate`, `Subquery`, `Window`, `Case`, `RawSQL` dentro de um
queryset): ele mantém o escopo de tenant automático. SQL cru só quando o ORM não resolver.

```text
apps/<app>/
├── queries/
│   ├── __init__.py
│   └── movements_report.py  ← MOVEMENTS_REPORT = """-- RELATORIO DE MOVIMENTACOES ..."""
└── selectors.py             ← importa a constante, passa o contexto e executa
```

### Formato do SQL (definido pelo usuário)

Objetivo: copiar o SQL para o DataGrip/DBeaver e depurar trocando só os valores de `parametros`.

1. **1ª linha:** comentário com o nome da funcionalidade **em PT-BR** (`-- RELATORIO XPTO`,
   `-- DASHBOARD ABC`); o restante (constante, função, parâmetros, colunas) em inglês.
2. **Parâmetros primeiro**, num CTE `parametros`; o restante resolve com JOIN nele:

```sql
-- RELATORIO XPTO
WITH parametros AS (
    SELECT
        %(contract)s::bigint AS contract,
        %(organization)s::bigint AS organization
)
SELECT x.public_id, x.name
FROM dsc_xpto x
JOIN parametros p ON p.contract = x.contract_id AND p.organization = x.organization_id
```

3. **Tabela temporária**, quando precisar separar etapas: tudo no mesmo SQL, num único `execute`:

```sql
-- RELATORIO XYZ
CREATE TEMPORARY TABLE parametros ON COMMIT DROP AS
SELECT
    %(contract)s::bigint AS contract,
    %(organization)s::bigint AS organization;
CREATE INDEX ON parametros (contract, organization);  -- só se o EXPLAIN justificar
ANALYZE parametros;
-- demais etapas (outras temporárias, índices) com JOIN em parametros
SELECT ...;
```

### Regras

| Regra | Motivo |
|---|---|
| Um arquivo por query, com uma constante `UPPER_SNAKE` de nome igual ao do arquivo | achar e revisar cada query isoladamente |
| Só o SQL literal no arquivo, sem lógica nem import do app | mesma regra do `constants.py` |
| `contract` e `organization` são o **id interno** (bigint), com cast explícito | JOIN direto; o banco infere o tipo do parâmetro |
| Parâmetros nomeados (`%(contract)s`), nunca f-string, `format` ou concatenação; nomes únicos no SQL | SQL injection (skill `owasp-top-10`, A03) |
| Só o selector executa, com `@tenant_params`; falha sem contrato/organização (`TenantContextMissing`) | SQL cru não passa pelo manager com escopo (ADR 0006 §1.3) |
| Ler o resultado com `fetch_all(cursor)` | o cursor começa no resultado do 1º comando; `fetch_all` avança até o último |
| Um SQL com tabela `parametros` por transação | `ON COMMIT DROP` só apaga no fim da transação |
| Não ativar `server_side_binding` no banco | vários comandos com parâmetros num `execute` dependem do binding no cliente (padrão do Django), testado em 2026-10-04 |
| Teste de isolamento próprio para cada query (outro contrato e outra organização) | a camada F (2.5) testa managers, não SQL cru |
| Revisar `EXPLAIN` e índices | skill `revisao-performance` |

### Selector

`@tenant_params` (`apps/core/tenancy.py`) valida o contexto e injeta `tenant`;
`fetch_all` (`apps/core/utils.py`) avança até o último resultado e devolve dicionários.

```python
from django.db import connection

from apps.core.tenancy import tenant_params
from apps.core.utils import fetch_all

from .queries.feedlot_batch_details import FEEDLOT_BATCH_DETAILS


@tenant_params(organization=True)  # organization=False: só exige contrato
def feedlot_batch_details(feedlot_id, diet_id, day, include_costs=False, *, tenant):
    with connection.cursor() as cursor:
        cursor.execute(
            FEEDLOT_BATCH_DETAILS,
            {
                **tenant,  # {'contract': ..., 'organization': ...} do contexto
                'feedlot_id': feedlot_id,
                'diet_id': diet_id,
                'day': day,
                'include_costs': include_costs,
            },
        )
        return fetch_all(cursor)
```

Contrato e organização **nunca** são argumentos do selector (anti-IDOR, OWASP A01): vêm do
contexto validado. Parâmetros de negócio entram como argumentos; o JOIN com `parametros`
garante que um id de outro contrato não retorne nada. Nomes de funções, parâmetros e
queries em inglês, como o restante do código; só o comentário da 1ª linha é em PT-BR. Exemplo testado em
`apps/core/tests/test_raw_queries.py`.

### Funções do PostgreSQL

Mesmo formato: os parâmetros da função alimentam o CTE/tabela `parametros`. O SQL fica em
`queries/<nome>.py`; um management command futuro aplicará as funções de forma idempotente
(`CREATE OR REPLACE FUNCTION`) no deploy. Até ele existir, não criar funções no banco.

A pasta `.ai/queries/` da raiz é outra coisa: consultas de investigação para agentes de IA.

## Views administrativas e serializers auditados

Actions customizadas seguem o padrão do Spatial, adaptado ao contrato do Core
(ADR 0031). Helpers em core/responses.py; sempre passar request no erro:

```python
@action(detail=True, methods=['patch'], url_path='custom-action')
def custom_action(self, request, *args, **kwargs):
    try:
        instance = self.get_object()
        result = execute_action(instance=instance, actor=request.user)
        return build_result_response(result, status_code=status.HTTP_200_OK)
    except Exception as exc:
        return build_exception_response(exception=exc, request=request)
```

execute_action é ilustrativo: declarar a operação do domínio. Não copiar a mensagem
da exceção para respostas/logs; o helper preserva RFC 9457 e rollback pelo handler.
Este padrão vale para actions próprias; list/create/update/delete continuam no DRF.

`BaseModelViewSet` e `BaseAdminModelViewSet`, em `apps/core/views.py`, compõem os
comportamentos compartilhados. Mixins ficam em `core/mixins.py`; paginação em
`core/pagination.py`, como a organização do Spatial, com o contrato próprio do Core.
Na declaração de uma base composta, preservar o cabeçalho compacto com mixins
agrupados e continuação alinhada, conforme o ajuste manual em `BaseModelViewSet`.
Usar `fmt: off/on` só nesse trecho para o Ruff não expandir o cabeçalho; lint e
limite de 120 caracteres continuam ativos.

| Componente | Responsabilidade |
|---|---|
| `SerializerDeleteMixin` | exclusão com autoria/auditoria via serializer.delete() |
| `BaseModelSerializer` | super().create/update do DRF, autoria, auditoria e hooks |
| `BaseAdminModelSerializer` | escrita global autorizada explicitamente ao superadmin |
| `BaseReadOnlyModelViewSet` | list/retrieve do DRF com filtros, paginação, options/schema |
| `ListFilterMixin` | aplica o backend django-filter nas listagens, preservando detalhes |
| `LookupOptionsMixin` | seleção UUID/rótulo |
| `TableSchemaMixin` | schema de campos declarados, metadados do model e OrderingFilter |
| `TenantScopedViewMixin` | acesso/autoria com escopo nos usos existentes |
| `StandardResultsSetPagination` | first/rows, limite 100 e resposta data/total_records |
| `BaseFilterSet` / backend DRF | filtros declarados e entrada validada/normalizada |

`BaseAdminModelViewSet` declara `SuperadminPermission`, compartilhada em
`core/permissions.py`, sem organização. A base comum preserva as permissões globais
de negação por padrão. Selectors de recursos comuns devem preservar o escopo;
CRUD auditado usa serializers; services ficam para operações próprias de domínio.

O recurso declara queryset e configurações explicitamente:

```python
class ContractViewSet(BaseAdminModelViewSet):
    queryset = Contract.objects.unscoped().select_related('plan')
    serializer_class = ContractSerializer
    filterset_class = ContractFilterSet


class ContractSerializer(BaseAdminModelSerializer):
    audit_fields = CONTRACT_AUDIT_FIELDS
    audit_events = {
        'create': Event.CONTRACT_CREATED,
        'update': Event.CONTRACT_UPDATED,
        'delete': Event.CONTRACT_DELETED,
    }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # Regras entre campos usando attrs e self.instance bloqueada.
        return attrs
```

Manter sempre a ordem: `queryset`, `serializer_class`, `filterset_class` e depois
as demais configurações. Consultas administrativas simples são declaradas diretamente
no queryset, lazy e sem SQL. get_queryset padrão do DRF clona por requisição.
A view chama serializer.save() pelo fluxo padrão do DRF. BaseModelSerializer
chama super().create/update, define o ator explicitamente e registra auditoria
atomicamente. Declare audit_fields e audit_events; evento ausente desfaz a escrita.
Campos são validados pelo DRF e regras entre campos pelo validate() do recurso.
Não usar full_clean genérico ou model_validation_fields/exclude na base.
Hooks create_extra(validated_data) e update_extra(instance, validated_data) ajustam
dados antes do super, sem salvar a instância. M2M padrão fica com o DRF (ADR 0030).
Preservar audit_events multiline quando ajustado pelo usuário; fmt: off/on local
pode preservar o formato sem desativar lint ou o limite de 120 caracteres.
Querysets administrativos usam `objects.unscoped()` explicitamente, preservam
inativos e excluem soft deleted; ContractViewSet mantém select_related('plan').
Não criar selector que só repita essa declaração; reservar selectors para lógica
própria de leitura. Sem classe de selector, staticmethod ou mixin (ADR 0028 substitui 0027).
Essa declaração é própria dos recursos globais com SuperadminPermission. Selectors
dependentes de tenant devem ser chamados em get_queryset durante a requisição,
ou usar TenantScopedViewMixin: construir queryset contextual na importação falha
ou capturaria o contexto errado. Não avaliar queryset na declaração da view.
ATOMIC_REQUESTS envolve validação e gravação na API. A view bloqueia o registro
antes de validar update/delete, com select_for_update(of=('self',)); o serializer
reutiliza essa instância. Uso direto exige atomic externo envolvendo ambos:

```python
with transaction.atomic():
    serializer = ContractSerializer(instance=contract, data=payload, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    updated = serializer.save()
```

Sem view, a validação recarrega a instância com lock para usar seu estado atual.
O contexto instance_locked é reservado ao fluxo interno da view; não configurá-lo
em chamadas diretas. SerializerDeleteMixin chama serializer.delete(), com soft
delete/autoria/auditoria na mesma transação. Services de users/RBAC permanecem;
o registry genérico e os services repetitivos de Plan/Contract foram removidos.

FilterSets do domínio ficam em `filters.py`, herdam `core.filters.BaseFilterSet`
e declaram os filtros/campos de busca/OrderingFilter. Não usar geração automática
de filtros do model: django-filter acessa o manager durante a importação; nossos
managers exigem contexto. Declarar BooleanFilter/UUIDFilter etc. explicitamente,
sem aliviar o fail closed. O queryset vem do selector e permanece lazy até paginar.

Busca geral é configurada no FilterSet:

```python
class ContractFilterSet(BaseFilterSet):
    general_search_fields = ('name',)
```

`search` pesquisa esses campos com OR; filtros individuais combinam com AND.
O padrão da base é vazio (busca desabilitada) e o lookup padrão é icontains.
Não reaproveitar automaticamente lookup de filtro individual: name=foo pode ser
exact enquanto search=foo continua pesquisando por trecho, preservando o contrato.
Para outra semântica, declarar `general_search_lookups = {'name': 'istartswith'}`.
Só aceitar os lookups textuais permitidos em core/constants; regex não é permitido.

Campos devem ser CharField/TextField ou subclasses; relações intermediárias devem
ser FK/OneToOne diretas, sem M2M/reversa multivalorada. Não converter números/datas/
UUID para texto nem adicionar distinct para encobrir multiplicação de linhas.
Campos/tipos/lookups inválidos são erros de configuração, sem fallback.

O schema tem bloco `general_search` com parameter/label/fields (field/label/lookup),
separado de `filters` (controles individuais). Null indica busca geral desabilitada.
Um campo pode ter filtro individual e participar da busca geral: seus significados
não são alterados pelo schema. Metadados vêm do FilterSet/model, sem avaliar queryset.
options_search_fields e o parâmetro q das seleções continuam independentes.

Adicionar campos à busca exige revisar volume, JOINs/índices e planos de execução.
Não expandir automaticamente para todos os campos textuais. O custo de icontains
é o mesmo das buscas anteriores por nome; não declarar aprovação sob carga sem medir
(ADR 0029).

O recurso declara `schema_columns`/`schema_filters` como nomes de campos e mantém
ações específicas (ex.: organizações do contrato). Regras ficam no validate() do
serializer; transações, locks e auditoria seguem o ADR 0030. A base exige superadmin
e não usa contexto organizacional; não deve ser usada em rotas comuns de tenant.

```python
schema_columns = ('name', 'start_date', 'licenses')
schema_column_overrides = {'start_date': {'label': _('Início')}}
schema_filters = ('plan',)
```

Labels usam `capfirst(model_field.verbose_name)`; o exemplo mantém "Início" como
sobrescrita, enquanto o padrão seria "Início da vigência". Não gerar colunas/filtros
para todos os campos: a lista explícita controla a exposição e a ordem.
`is_active` continua filtro comum. Tipos dos filtros vêm dos campos do model;
o filtro precisa existir no FilterSet. `ordering_fields` da resposta usa o
OrderingFilter do FilterSet, sem declaração duplicada na view.

Registrar recursos com `core.routers.SchemaRouter`. Ele relaciona models dos
serializers aos basenames dos endpoints options, no mesmo router. A base usa
`reverse` com o namespace atual, sem adivinhar caminhos e sem consultas ao banco.
Não permite duas rotas options para o mesmo model no mesmo router. Relação sem
rota registrada exige URL explícita em `schema_filter_overrides`:

```python
schema_filter_overrides = {'plan': {'label': _('Oferta'), 'options_url': '/other/plans/options/'}}
```

`schema_column_overrides` e `schema_filter_overrides` são mapas por campo; alteram
somente os metadados escolhidos. Campos desconhecidos/filtros não publicados/rotas
ausentes falham como configuração inválida, sem fallback silencioso (ADR 0026).

## Formatação e lint

`pyproject.toml` preserva a formatação manual de `models.py`:

- `ruff format` não reformata esses arquivos.
- O limite de **120 caracteres** é obrigatório, inclusive nos models (`E501` ativo).
- As demais verificações de lint continuam ativas, incluindo imports.
- Os demais arquivos seguem a configuração normal do Ruff.

Não aplicar formatação automática do editor aos models que desfaça esse padrão.
Migrations permanecem geradas pelo Django, com a exclusão própria já configurada;
não são referência de estilo para os models.

O limite de 120 caracteres foi confirmado pelo usuário e é uma convenção deste
projeto. A [PEP 8](https://peps.python.org/pep-0008/#maximum-line-length) recomenda
79 caracteres, permitindo até 99 por acordo da equipe; portanto, o limite do
projeto não deve ser descrito como o limite estrito da PEP 8.

No PyCharm, configurar a margem e a guia visual em 120 em
**Settings → Editor → Code Style → Python → Wrapping and Braces**. A guia é
configurável, conforme a [documentação do editor](https://www.jetbrains.com/help/pycharm/code-style-python.html#visual-guides),
e deve acompanhar o limite do projeto.

## Convenções de persistência

O estilo não altera as regras do [ADR 0007](../../../docs/adr/0007-identificadores-e-convencoes-de-persistencia.md):

- Models próprios herdam um dos quatro tipos de escopo derivados de `BaseModel`,
  exceto `User` e `Contract` (ADR 0012). Ver [escopos](../architecture/model-scopes.md).
- Ao personalizar `Meta`, herdar a do tipo de escopo para preservar managers e índices.
- `User` também herda `AbstractUser`, preservando o `is_active` do Django.
- Campos e código em inglês; rótulos em português com `gettext_lazy`.
- `id` é interno; `public_id` UUID v7 identifica registros externamente.
- Tabelas `dsc_` são automáticas; não repetir campos herdados ou nomes de tabela.

Regras operacionais de autoria e soft delete estão no
[README do backend](../../README.md#persistência-comum).
