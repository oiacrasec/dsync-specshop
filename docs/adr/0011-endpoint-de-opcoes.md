# 0011 — Endpoint de opções (autocomplete e seleção)

- **Status:** Aceito
- **Data:** 2026-10-03
- **Complementa:** ADR 0004 (contrato de API)

## Contexto

Os componentes de seleção do frontend de referência (`datasync-gis`) buscam opções na
API: o `ui-autocomplete` (seleção única) e os filtros do tipo `relation` do `ui-filter`.
Um autocomplete de **seleção múltipla** ainda não existe e será criado. O
`ui-multi-select` usa opções fixas, sem API.

No `datasync-spatial`, o `LookupOptionsMixin` expõe `GET …/options/` em cada recurso,
mas usa o **id inteiro** como valor, adivinha os campos de busca pelo nome, mistura
camelCase e resolve só um valor por vez.

## Decisão

Cada recurso que alimenta seleções expõe a ação **`options`**:

```text
GET /api/v1/categories/options/?q=cim&first=0&rows=20
GET /api/v1/categories/options/?public_id=<uuid>&public_id=<uuid>

{ "data": [{ "value": "<public_id>", "label": "Cimento" }], "total_records": 3, "has_next": false }
```

| Regra | |
|---|---|
| `value` | sempre o **`public_id`** (ADR 0007); nunca o id interno |
| `label` | texto de exibição definido no endpoint |
| Busca (`q`) | só nos campos **declarados** no endpoint (lista permitida, sem adivinhar) |
| Resolver rótulos | parâmetro `public_id` **repetível**: atende seleção única e múltipla |
| Paginação | `first` + `rows`; padrão **20**, máximo **100** (acima disso, 422, como nas listagens) |
| Inativos (`is_active = false`) | **não aparecem** na busca, mas **são resolvidos** por `public_id` |
| Excluídos (soft delete) | nunca aparecem |
| Contexto | o mesmo escopo do recurso (ADR 0006) |
| Permissão | a mesma **`view`** do recurso (ADR 0009) |
| Formato | snake_case; erros pela skill `erros-api-rfc9457` |

O esquema de filtros (`…/schema/`, ADR 0004) aponta, para cada filtro de relação, o
endpoint `options` correspondente.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Usar a listagem completa para preencher seleções | traz campos desnecessários e exige permissão de listagem com todos os dados |
| Id inteiro como valor (como o spatial) | permite enumeração (ADR 0007) |
| Campos de busca adivinhados | comportamento implícito; contraria a lista permitida (skill `owasp-top-10`, A05) |

## Consequências

- Frontend (ADR 0003): o `ui-autocomplete` passa a usar padrão de **20** linhas,
  `public_id` no lugar de `pk` e snake_case na resposta; será criado um
  **autocomplete múltiplo** usando o `public_id` repetível.
- Para escolher um registro relacionado (ex.: categoria no cadastro de produto), o
  usuário precisa da permissão `view` do recurso relacionado.
