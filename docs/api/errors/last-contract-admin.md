# last-contract-admin

- **Type:** `urn:datasync:problem:last-contract-admin`
- **HTTP:** 409
- **Title:** Último administrador do contrato
- **Detail padrão:** O contrato precisa manter pelo menos um administrador.
- **Quando:** Tentativa de remover o último administrador do contrato.
- **Origem:** LastContractAdmin (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

Disparada desde a etapa 3.4 por `save_assignment`, `delete_assignment`, `save_user` e
`delete_user` (ver [RBAC](../../domain/rbac.md#último-administrador-etapa-34)).
