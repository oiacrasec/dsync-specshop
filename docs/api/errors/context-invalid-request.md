# context-invalid-request

- **Type:** `urn:datasync:problem:context-invalid-request`
- **HTTP:** 400
- **Title:** Contexto de organização inválido
- **Detail padrão:** Informe uma organização válida no header X-Organization-Id.
- **Quando:** Header X-Organization-Id ausente ou malformado.
- **Origem:** ContextInvalidRequest (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

O cliente deve limpar o contexto e voltar à seleção de organização.

Disparada por `apps/core/context.py` desde a etapa 3.3 (ver [RBAC](../../domain/rbac.md)).
