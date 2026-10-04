# profile-in-use

- **Type:** `urn:datasync:problem:profile-in-use`
- **HTTP:** 409
- **Title:** Perfil em uso
- **Detail padrão:** Remova as atribuições do perfil antes de excluí-lo.
- **Quando:** Tentativa de excluir um perfil ainda atribuído a usuários.
- **Origem:** ProfileInUse (em `apps/core/exceptions.py` ou no framework).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

A etapa 3.2 dispara essa exceção em apps/rbac/services.py ao excluir um perfil
com atribuições não excluídas, inclusive inativas. Remover as atribuições antes
de tentar novamente. Ainda não existe endpoint de gestão nesta etapa.
