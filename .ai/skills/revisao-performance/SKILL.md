---
name: revisao-performance
description: Checklist de revisão de performance de banco e API (Django ORM, DRF, PostgreSQL). Use SEMPRE ao revisar código, PRs ou diffs e ao implementar selectors, services, serializers, listagens, relatórios, endpoints options ou qualquer código que consulte o banco. Cobre N+1, select_related/prefetch_related, agregação, anotação, subquery, CTE, índices, operações em lote e testes de contagem de queries.
---

# Revisão de performance

> **Regra de ouro:** o número de queries de um endpoint **não cresce com a quantidade de
> registros**. Toda listagem tem quantidade de queries **constante** e provada em teste.
> Na dúvida, medir (skill `questionador`: nunca supor que "é rápido").

## Como revisar

0. Aplicar a premissa global do usuário a toda mudança, inclusive frontend, middleware,
   tarefas e integrações. Avaliar frequência de execução, crescimento com dados/usuários,
   escritas desnecessárias em leituras, duração e abrangência de locks, CPU, memória,
   tráfego e contenção. Autenticação admite trabalho necessário à segurança; isso não
   autoriza repetir esse custo no uso cotidiano. Contagem constante de queries não
   demonstra, sozinha, baixo custo ou boa escalabilidade. Para caminhos de alto volume
   ou custos novos relevantes, medir latência/capacidade e recursos sob carga adequada,
   além das queries; registrar limites da evidência e corrigir gargalos graves antes
   da entrega. Não inventar metas de desempenho ou declarar aprovação sob carga sem medição.

1. Ler o diff procurando acesso ao banco: querysets, serializers, propriedades de model, loops.
2. Passar pelo checklist abaixo.
3. Reportar cada achado assim:

| Severidade | Categoria | Local | Problema | Impacto | Correção |
|---|---|---|---|---|---|
| 🔴 / 🟠 / 🟡 / 🔵 | N+1, agregação, índice… | `selectors.py:42` | o que está errado | ex.: 1 query por linha = 101 queries em 100 itens | o que fazer |

## 1. N+1 🔴 (o problema mais comum)

Uma query para a lista + **uma por item** para buscar um relacionado.

```python
# ❌ N+1: 1 query + 1 por movimento
for m in StockMovement.objects.all():
    print(m.product.name)

# ✅ 1 query com JOIN
for m in StockMovement.objects.select_related('product'):
    print(m.product.name)
```

| Relação | Use |
|---|---|
| FK / OneToOne (para "um") | `select_related()` (JOIN) |
| reversa / ManyToMany (para "muitos") | `prefetch_related()` (1 query extra por relação, não por item) |
| prefetch com filtro, ordenação ou `select_related` interno | `Prefetch('items', queryset=...)` |

Pontos onde o N+1 se esconde:

- [ ] `SerializerMethodField` e serializers aninhados que acessam relacionados.
- [ ] `__str__` do model usado no `label` do endpoint `options` (ADR 0011).
- [ ] `@property` no model que faz query.
- [ ] Checagem de permissão por item dentro de um loop (calcular **uma vez** por requisição, ADR 0009).
- [ ] Templates de relatório (PDF) iterando relacionados.

**Onde corrigir:** no **selector** (ADR 0002), nunca espalhado pela view.

## 2. Contar, somar e agrupar no banco, não no Python 🟠

```python
# ❌ traz todas as linhas para contar ou somar no Python
total = sum(m.quantity for m in movements)
qtd = len(Product.objects.filter(...))

# ✅ o banco calcula
from django.db.models import Count, Sum
total = movements.aggregate(total=Sum('quantity'))['total']
qtd = Product.objects.filter(...).count()
```

| Precisa de | Use |
|---|---|
| **um** valor para o conjunto inteiro | `aggregate()` |
| um valor **por linha** (ex.: saldo por produto) | `annotate()` |
| agrupar por campo | `values('campo').annotate(...)` |
| só saber se existe | `.exists()` (nunca `len()` nem `count() > 0`) |
| contar | `.count()` (nunca `len(queryset)`) |
| filtrar pelo resultado agregado | `annotate()` + `filter()` (vira `HAVING`) |

⚠️ Vários `Count` com JOINs diferentes na mesma query **multiplicam** linhas e dão
números errados: usar `Count(..., distinct=True)` ou `Subquery`.

## 3. Subquery e Exists 🟠

Valor de outra tabela por linha, sem loop e sem JOIN que duplica linhas:

```python
from django.db.models import Exists, OuterRef, Subquery

last_entry = StockMovement.objects.filter(product=OuterRef('pk')).order_by('-created_at')
products = Product.objects.annotate(
    last_movement_at=Subquery(last_entry.values('created_at')[:1]),
    has_movement=Exists(StockMovement.objects.filter(product=OuterRef('pk'))),
)
```

## 4. CTE (WITH) 🟡

- O ORM do Django **não tem CTE nativa**.
- Usar CTE para hierarquias e recursões (ex.: árvore de categorias) ou cálculos em etapas
  que ficariam ilegíveis em subqueries aninhadas.
- Duas formas:
  - SQL com **parâmetros** (`cursor.execute(sql, params)`), nunca f-string (skill `owasp-top-10`, A05);
  - biblioteca `django-cte` (suporta Django 5.2): é uma **dependência nova**, que exige
    aprovação e checagem de licença (skill `propriedade-intelectual`).
- SQL manual **também** respeita o escopo de contrato e organização (ADR 0006): o filtro
  de contexto entra explicitamente no `WHERE` e é coberto por teste de isolamento.

## 5. Trazer só o necessário 🟡

- [ ] `.only()` / `.defer()` para tabelas largas, ou `.values()` / `.values_list()` quando não precisa de instância.
- [ ] Nada de `SELECT *` com campos grandes (JSON, texto, binário) numa listagem que não os usa.
- [ ] Paginação **sempre** em listagens: `rows` padrão 20, máximo 100 (ADR 0004).
- [ ] Grandes volumes em tarefas e exportações: `.iterator(chunk_size=...)`, nunca carregar tudo na memória.

## 6. Escrita em lote 🟠

```python
# ❌ uma query por item
for item in items:
    Item.objects.create(**item)

# ✅ poucas queries
Item.objects.bulk_create([Item(**i) for i in items], batch_size=500)
Product.objects.filter(...).update(stock=F('stock') - 1)   # sem ler para depois gravar
```

- [ ] `bulk_create` / `bulk_update` em importações e lotes (atenção: não chamam `save()` nem signals; preencher `public_id`, contexto e auditoria explicitamente).
- [ ] `update()` com `F()` para incrementos, evitando condição de corrida.
- [ ] `select_for_update()` dentro de transação quando dois processos podem alterar o mesmo registro (ex.: saldo de estoque).

## 7. Índices 🟠

- [ ] Índices compostos começando pelo contexto: `(contract_id, organization_id, …)` (ADR 0006).
- [ ] Campo usado em `filter`, `order_by` ou `ordering` permitido da listagem tem índice adequado.
- [ ] `public_id` único (ADR 0007).
- [ ] Busca textual (`q` do `options`, `search`) em tabelas grandes: avaliar índice próprio (ex.: trigram), nunca `icontains` sem medir.
- [ ] Índice parcial quando a maioria das consultas ignora excluídos (`WHERE deleted_at IS NULL`).
- [ ] Não criar índice sem uso: cada índice custa na escrita.

## 8. Medir 🔵

- [ ] **Teste de contagem de queries** em toda listagem e endpoint crítico:

```python
def test_list_products_constant_queries(api_client, django_assert_max_num_queries):
    ProductFactory.create_batch(30)
    with django_assert_max_num_queries(5):
        api_client.get('/api/v1/products/')
```

  O número não pode mudar entre 1 e 30 itens.
- [ ] Query suspeita: `EXPLAIN ANALYZE` no PostgreSQL (procurar `Seq Scan` em tabela grande, `rows` estimado × real muito diferentes).
- [ ] Em desenvolvimento: inspecionar as queries de cada requisição (ex.: log de SQL em `DEBUG`).

## 9. API e frontend

- [ ] Endpoint `options` leve: só `value` e `label`, sem serializer completo (ADR 0011).
- [ ] Esquema da tabela (`…/schema/`) com cache no frontend (ADR 0004).
- [ ] Angular: `track` em listas (`@for … track item.public_id`) e sem chamadas repetidas à API na mesma tela.

## Relação com outras skills

`owasp-top-10` (SQL parametrizado, limites) · `erros-api-rfc9457` (422 acima do limite
de página) · `questionador` (medir em vez de supor).
