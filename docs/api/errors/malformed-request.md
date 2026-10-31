# malformed-request

- **Type:** `urn:dsync:problem:malformed-request`
- **HTTP:** 400
- **Title:** Requisição malformada
- **Detail padrão:** Verifique a sintaxe da requisição.
- **Quando:** Sintaxe inválida, como JSON quebrado; inclui SuspiciousOperation.
- **Origem:** DRF ParseError ou Django SuspiciousOperation (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.
