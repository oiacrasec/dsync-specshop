# context-forbidden

- **Type:** `urn:datasync:problem:context-forbidden`
- **HTTP:** 403
- **Title:** Sem acesso à organização
- **Detail padrão:** Você não tem acesso à organização selecionada.
- **Quando:** Organização inexistente, fora do contrato ou sem atribuição de acesso.
- **Origem:** ContextForbidden (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

O cliente deve limpar o contexto e voltar à seleção de organização.

Nesta etapa, a exceção está disponível e testada. A regra de negócio que a dispara
será implementada na etapa correspondente do plano da Entrega 1.
