# profile-in-use

- **Type:** `urn:datasync:problem:profile-in-use`
- **HTTP:** 409
- **Title:** Perfil em uso
- **Detail padrão:** Remova as atribuições do perfil antes de excluí-lo.
- **Quando:** Tentativa de excluir um perfil ainda atribuído a usuários.
- **Origem:** ProfileInUse (em `apps/core/exceptions.py` ou no framework).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

Nesta etapa, a exceção está disponível e testada. A regra de negócio que a dispara
será implementada na etapa correspondente do plano da Entrega 1.
