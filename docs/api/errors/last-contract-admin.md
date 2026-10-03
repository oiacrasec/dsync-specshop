# last-contract-admin

- **Type:** `urn:datasync:problem:last-contract-admin`
- **HTTP:** 409
- **Title:** Último administrador do contrato
- **Detail padrão:** O contrato precisa manter pelo menos um administrador.
- **Quando:** Tentativa de remover o último administrador do contrato.
- **Origem:** LastContractAdmin (em `apps/core/exceptions.py` ou no framework).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

Nesta etapa, a exceção está disponível e testada. A regra de negócio que a dispara
será implementada na etapa correspondente do plano da Entrega 1.
