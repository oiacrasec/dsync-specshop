# license-limit-reached

- **Type:** `urn:datasync:problem:license-limit-reached`
- **HTTP:** 409
- **Title:** Limite de licenças atingido
- **Detail padrão:** O contrato não possui licenças disponíveis para cadastrar outro usuário.
- **Quando:** Cadastro, transferência ou restauração de usuário sem licença disponível no contrato.
- **Origem:** LicenseLimitReached (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

Desde a etapa 2.2, `apps.users.services.save_user` dispara a exceção. Ativos e
inativos não excluídos consomem vaga; desativar não libera, soft delete libera.
Não há endpoint de gestão de usuários ainda; o handler RFC 9457 já cobre a exceção.
