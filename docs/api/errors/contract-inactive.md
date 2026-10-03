# contract-inactive

- **Type:** `urn:datasync:problem:contract-inactive`
- **HTTP:** 403
- **Title:** Contrato indisponível
- **Detail padrão:** O contrato está vencido ou desativado.
- **Quando:** Contrato vencido ou desativado.
- **Origem:** ContractInactive (em `apps/core/exceptions.py` ou no framework).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

O cliente deve encerrar a sessão local. A validação de vigência e situação entra
nas etapas de contratos/contexto do plano.

Nesta etapa, a exceção está disponível e testada. A regra de negócio que a dispara
será implementada na etapa correspondente do plano da Entrega 1.
