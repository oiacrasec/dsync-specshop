# last-active-organization

- **Type:** `urn:datasync:problem:last-active-organization`
- **HTTP:** 409
- **Title:** Última organização ativa
- **Detail padrão:** O contrato precisa manter pelo menos uma organização ativa.
- **Quando:** desativar ou excluir a única organização ativa do contrato (decisão 52): sem ela,
  ninguém do contrato consegue selecionar organização.
- **Origem:** LastActiveOrganization (classe em `apps/core/exceptions.py`; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.
