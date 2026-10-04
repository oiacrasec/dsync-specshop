# Estilo dos models Django

Padrão obrigatório definido pelo usuário para os models do backend. Exemplo de
referência: [models](../examples/model.md). Implementações atuais:
`apps/core/models.py` e `apps/users/models.py`.

## Declaração de campos

- Manter campos curtos e seus argumentos na mesma linha, até **120 caracteres**.
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
| `services.py` / `selectors.py` | escrita com regra de negócio / leituras |
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
│   └── relatorio_xpto.py    ← RELATORIO_XPTO = """-- RELATORIO XPTO ..."""
└── selectors.py             ← importa a constante, passa o contexto e executa
```

### Formato do SQL (definido pelo usuário)

Objetivo: copiar o SQL para o DataGrip/DBeaver e depurar trocando só os valores de `parametros`.

1. **1ª linha:** comentário com o nome da funcionalidade (`-- RELATORIO XPTO`, `-- DASHBOARD ABC`).
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
| Só o selector executa; lê `contract`/`organization` de `get_context()` e falha sem contrato (`TenantContextMissing`) | SQL cru não passa pelo manager com escopo (ADR 0006 §1.3) |
| Com vários comandos, o selector avança até o último resultado (`while cursor.nextset(): pass`) | o cursor começa no resultado do 1º comando |
| Um SQL com tabela `parametros` por transação | `ON COMMIT DROP` só apaga no fim da transação |
| Não ativar `server_side_binding` no banco | vários comandos com parâmetros num `execute` dependem do binding no cliente (padrão do Django), testado em 2026-10-04 |
| Teste de isolamento próprio para cada query (outro contrato e outra organização) | a camada F (2.5) testa managers, não SQL cru |
| Revisar `EXPLAIN` e índices | skill `revisao-performance` |

### Selector

```python
from django.db import connection

from apps.core.tenancy import TenantContextMissing, get_context

from .queries.relatorio_xpto import RELATORIO_XPTO


def relatorio_xpto():
    context = get_context()
    if context is None or context.contract_id is None:
        raise TenantContextMissing('relatorio_xpto exige contrato no contexto.')
    params = {'contract': context.contract_id, 'organization': context.organization_id}
    with connection.cursor() as cursor:
        cursor.execute(RELATORIO_XPTO, params)
        while cursor.nextset():  # SQL com vários comandos: resultado do último.
            pass
        return cursor.fetchall()
```

### Funções do PostgreSQL

Mesmo formato: os parâmetros da função alimentam o CTE/tabela `parametros`. O SQL fica em
`queries/<nome>.py`; um management command futuro aplicará as funções de forma idempotente
(`CREATE OR REPLACE FUNCTION`) no deploy. Até ele existir, não criar funções no banco.

A pasta `.ai/queries/` da raiz é outra coisa: consultas de investigação para agentes de IA.

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
