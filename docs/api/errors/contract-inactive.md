# contract-inactive

- **Type:** `urn:datasync:problem:contract-inactive`
- **HTTP:** 403
- **Title:** Contrato indisponível
- **Detail padrão:** O contrato está vencido ou desativado.
- **Quando:** Contrato vencido ou desativado.
- **Origem:** ContractInactive (em `apps/core/exceptions.py` ou no framework).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

O cliente deve encerrar a sessão local. Disparado no login (após senha correta), no
refresh e na autenticação de toda rota protegida (etapa 2.3); ver
[contratos](../../domain/contracts.md).
