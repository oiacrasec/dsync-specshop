# contract-not-provisionable

- **Type:** `urn:dsync:problem:contract-not-provisionable`
- **HTTP:** 409
- **Title:** Contrato não pode ser provisionado
- **Detail padrão:** O provisionamento exige contrato disponível, sem usuários e sem organizações.
- **Quando:** `POST /api/v1/admin/contracts/{public_id}/provision/` em contrato inativo, vencido ou
  com início futuro, ou que já tenha usuário ou organização não excluídos (inclusive inativos).
- **Origem:** ContractNotProvisionable (classe em `apps/core/exceptions.py`; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

Não usa `contract-inactive` de propósito: esse tipo encerra a sessão no cliente, e quem
provisiona é o superadmin. Novos usuários e organizações de um contrato já provisionado
entram pela gestão de usuários e organizações (etapas 5.3/5.4). Ver
[administração](../admin-contracts.md#provisionamento-do-contrato-66).
