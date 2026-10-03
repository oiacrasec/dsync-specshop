# validation-error

- **Type:** `urn:datasync:problem:validation-error`
- **HTTP:** 422
- **Title:** Dados inválidos
- **Detail padrão:** Corrija os campos indicados em errors.
- **Quando:** Sintaxe correta, mas campos ou regras de validação inválidos.
- **Origem:** DRF ValidationError ou Django ValidationError (em `apps/core/exceptions.py` ou no framework).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

Inclui `errors`: objeto campo → lista de mensagens. Campos aninhados usam pontos;
itens de listas usam índices (ex.: `items.0.quantity`). Erros gerais usam
`non_field_errors`.
