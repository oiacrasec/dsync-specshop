# permission-denied

- **Type:** `urn:datasync:problem:permission-denied`
- **HTTP:** 403
- **Title:** Acesso negado
- **Detail padrão:** Você não tem permissão para acessar este recurso.
- **Quando:** Ausência da permissão exigida para acessar o recurso.
- **Origem:** DRF PermissionDenied ou Django PermissionDenied (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.
