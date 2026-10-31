# context-forbidden

- **Type:** `urn:dsync:problem:context-forbidden`
- **HTTP:** 403
- **Title:** Sem acesso à organização
- **Detail padrão:** Você não tem acesso à organização selecionada.
- **Quando:** Organização inexistente, fora do contrato ou sem atribuição de acesso.
- **Origem:** ContextForbidden (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

O cliente deve limpar o contexto e voltar à seleção de organização.

Disparada por `apps/core/context.py` e `apps/rbac/permissions.py` desde a etapa 3.3 (ver [RBAC](../../domain/rbac.md)).
