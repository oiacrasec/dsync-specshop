# validation-error

- **Type:** `urn:dsync:problem:validation-error`
- **HTTP:** 422
- **Title:** Dados inválidos
- **Detail padrão:** Corrija os campos indicados em errors.
- **Quando:** Sintaxe correta, mas campos ou regras de validação inválidos.
- **Origem:** DRF ValidationError ou Django ValidationError (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

Inclui `errors`: objeto campo → lista de mensagens. Campos aninhados usam pontos;
itens de listas usam índices (ex.: `items.0.quantity`). Erros gerais usam
`non_field_errors`.
