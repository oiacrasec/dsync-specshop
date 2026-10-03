# malformed-request

- **Type:** `urn:datasync:problem:malformed-request`
- **HTTP:** 400
- **Title:** Requisição malformada
- **Detail padrão:** Verifique a sintaxe da requisição.
- **Quando:** Sintaxe inválida, como JSON quebrado; inclui SuspiciousOperation.
- **Origem:** DRF ParseError ou Django SuspiciousOperation (em `apps/core/exceptions.py` ou no framework).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.
