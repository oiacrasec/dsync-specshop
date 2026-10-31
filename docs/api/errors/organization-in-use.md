# organization-in-use

- **Type:** `urn:dsync:problem:organization-in-use`
- **HTTP:** 409
- **Title:** Organização em uso
- **Detail padrão:** Remova as atribuições e exceções de acesso desta organização antes de excluí-la.
- **Quando:** `DELETE /api/v1/organizations/{public_id}/` de organização que é escopo de atribuição
  ou alvo de exceção não excluídas (inclusive inativas), decisão 51.
- **Origem:** OrganizationInUse (classe em `apps/core/exceptions.py`; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.
