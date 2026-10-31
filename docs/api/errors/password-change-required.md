# password-change-required

- **Type:** `urn:dsync:problem:password-change-required`
- **HTTP:** 403
- **Title:** Troca de senha obrigatória
- **Detail padrão:** Troque a senha temporária antes de usar o sistema.
- **Quando:** usuário comum autenticado por JWT com must_change_password=true.
- **Origem:** PasswordChangeRequired, disparada por JWTAuthentication.authenticate.

Segue o [contrato global](../errors.md), com application/problem+json e request_id.
O cliente deve abrir a tela de troca mantendo a sessão restrita, sem repetir a
requisição bloqueada. POST /api/v1/auth/change-password/, refresh e logout continuam
disponíveis. Superadmin é isento. Não confundir com contract-inactive (encerrar sessão).
Ver [autenticação](../authentication.md#primeiro-acesso-e-troca-de-senha-64).
