# not-found

- **Type:** `urn:dsync:problem:not-found`
- **HTTP:** 404
- **Title:** Recurso não encontrado
- **Detail padrão:** O recurso solicitado não foi encontrado.
- **Quando:** Rota ou registro inexistente; registro fora do contexto recebe a mesma resposta.
- **Origem:** DRF NotFound, Django Http404 ou fallback de rotas (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.
