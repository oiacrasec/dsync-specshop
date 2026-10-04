# authentication-required

- **Type:** `urn:datasync:problem:authentication-required`
- **HTTP:** 401
- **Title:** Autenticação necessária
- **Detail padrão:** Informe credenciais válidas para acessar este recurso.
- **Quando:** Credenciais ausentes, inválidas ou expiradas.
- **Origem:** DRF NotAuthenticated ou AuthenticationFailed (classes em `apps/core/exceptions.py` ou do framework; resposta em `apps/core/problems.py`).

Segue o [contrato global](../errors.md): `application/problem+json`, `instance`
sem query string e `request_id` igual ao header `X-Request-Id`.

A resposta preserva o desafio `WWW-Authenticate` do autenticador; se a exceção
não fornecer desafio, usa `Bearer`, conforme a autenticação JWT prevista no ADR 0004.
O cliente deve encerrar a sessão local e solicitar nova autenticação.
