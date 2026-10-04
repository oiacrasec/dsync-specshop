# Opções de seleção

Contrato do ADR 0011, implementado na etapa 5.1 por `LookupOptionsMixin`.
Esta etapa disponibiliza a infraestrutura; não publica recursos de negócio.

```http
GET /api/v1/categories/options/?q=cim&first=0&rows=20
GET /api/v1/categories/options/?public_id=<uuid>&public_id=<uuid>
```

```json
{
  "data": [{"value": "<public_id>", "label": "Cimento"}],
  "total_records": 1,
  "has_next": false
}
```

| Parâmetro | Comportamento |
|---|---|
| `q` | Texto de até 255 caracteres; espaços externos removidos; busca por trecho, sem distinguir maiúsculas, somente nos campos declarados |
| `first` | Offset inteiro não negativo, padrão 0 |
| `rows` | Inteiro de 1 a 100, padrão 20 |
| `public_id` | UUID repetível, até 100 valores; quando informado, resolve rótulos e ignora `q` |

Na busca aparecem apenas ativos. A resolução por UUID inclui inativos, mas nunca
excluídos ou registros fora do contexto. UUID desconhecido não retorna opção.
Valores repetidos não duplicam registros. A resolução também respeita `first` e
`rows`: para até 100 seleções, envie `rows=100` ou percorra as páginas.

Ordem por rótulo, com UUID como desempate. `total_records` é a contagem exata do
conjunto filtrado; `has_next` indica se há registros após a página atual.
Entrada inválida retorna 422 em [RFC 9457](errors.md). Falta de autenticação retorna
401; falta de permissão, 403. Contexto organizacional segue as regras comuns.

## Uso no backend

```python
class CategoryViewSet(LookupOptionsMixin, TenantScopedViewMixin, viewsets.GenericViewSet):
    model = Category
    required_permission = {'options': 'category:view'}
    options_label_field = 'name'
    options_search_fields = ('name',)
```

O código `category:view` do exemplo precisa existir no registry. Declare para
`options` a mesma permissão `:view` do recurso; `:manage` e `:create` não substituem
leitura. O mixin adiciona essa exigência mesmo quando a view usa `AllowAuthenticated`
e preserva outras restrições declaradas, como acesso exclusivo à administração.

`get_queryset()` fornece o escopo e quaisquer restrições próprias do recurso; não
deve filtrar inativos, pois isso impediria resolver seleções existentes.
Nunca declare queryset avaliado no nível da classe nem use `unscoped()` para
contornar o contexto. O selector também exclui soft deletes explicitamente.

Rótulo e campos de busca são campos SQL declarados, locais ou por relações FK/OneToOne
singulares (ex.: `product__name`). Não usar relações multivaloradas, propriedades,
`__str__` ou serializers completos. O campo de rótulo deve fornecer texto não nulo.
Ausência de configuração falha com erro interno genérico, sem adivinhar campos.

## Performance e publicação

O selector faz duas consultas: `COUNT` e projeção paginada de UUID/rótulo. Relações
singulares usam JOIN, sem uma consulta por item. Materializa no máximo 100 opções,
sem escritas ou locks explícitos. Nos testes com 1 e 30 itens, foram duas consultas
no selector e sete operações SQL na requisição autenticada por `force_authenticate`
(incluindo contexto/RBAC e controle transacional), sem INSERT/UPDATE/DELETE.
Essa contagem não inclui a validação JWT real nem certifica capacidade sob carga.

`icontains`, contagem exata e offsets altos podem ter custo crescente no banco.
O limite de página controla resposta/memória, não limita linhas examinadas pelo SQL.
Antes de publicar cada recurso, medir busca/contagem/ordenação com volume e
concorrência representativos, analisar EXPLAIN ANALYZE e definir índices adequados
ao contexto e aos campos reais. Não criar índices genéricos sem uso demonstrado.
Esta etapa não adiciona tabelas, migrations ou endpoints à URL de produção.
