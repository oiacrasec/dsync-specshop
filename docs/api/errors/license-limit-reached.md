# license-limit-reached

- **Type:** `urn:datasync:problem:license-limit-reached`
- **HTTP:** 409
- **Title:** Limite de licenças atingido
- **Detail padrão:** O contrato não possui licenças disponíveis para cadastrar outro usuário.
- **Quando:** Cadastro de usuário além das licenças disponíveis no contrato.
- **Origem:** LicenseLimitReached (em `apps/core/exceptions.py` ou no framework).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

Nesta etapa, a exceção está disponível e testada. A regra de negócio que a dispara
será implementada na etapa correspondente do plano da Entrega 1.
