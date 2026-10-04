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
| módulo temático (ex.: `problems.py`) | bloco grande de um único tema, para o `utils.py` não virar gaveta |

Não misturar auxiliares no módulo do middleware (ex.: `apps/audit/utils.py` marca a
entrada do superadmin; `apps/audit/middleware.py` só grava).

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
