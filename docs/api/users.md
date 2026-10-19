# Usuários do contrato

Área do cliente (etapa 8.1, decisões 54–56). Gestão **reservada** ao administrador do contrato
(perfil essencial, ADR 0009 §3.1); superadmin com `X-Organization-Id` também pode. Todas as rotas
exigem o header de uma organização acessível (400/403 como nos endpoints de negócio).

| Método | Rota | Permissão (reservada) |
|---|---|---|
| GET | `/api/v1/users/`, `{public_id}/`, `options/`, `schema/` | `user:view` |
| POST | `/api/v1/users/` | `user:create` |
| PUT / PATCH | `/api/v1/users/{public_id}/` | `user:update` |
| DELETE | `/api/v1/users/{public_id}/` | `user:delete` (soft delete; libera a licença) |
| POST | `/api/v1/users/{public_id}/reset-password/` | `user:manage` |

Lista só usuários do contrato (superadmins e outros contratos nunca aparecem; outro contrato → 404).
Campos: `username` (validador do Django, único no sistema inteiro, inclusive excluídos), `name`
(`first_name`), `is_active`; saída também com `public_id`, `must_change_password`, `created_at`,
`updated_at`. Listagem: `search` (username e nome), `is_active`, `ordering` (`username`, `first_name`,
`created_at`, `updated_at`; padrão `username`).

- **Criação:** senha temporária gerada no servidor (mesmo gerador do provisionamento), devolvida
  **uma vez** em `temporary_password`, com `must_change_password=true` e resposta `no-store`.
- **Reset:** `{"user": {...}, "temporary_password": "..."}`; marca a troca obrigatória e revoga todos
  os refresh da conta (`users.services.reset_password`, mesma regra do 6.7).

| Regra | Resposta |
|---|---|
| `username` em uso ou inválido | 422 em `errors.username` |
| Contrato sem licença livre | 409 `license-limit-reached` |
| Desativar/excluir o último administrador ativo | 409 `last-contract-admin` |
| Sem a permissão reservada | 403 `permission-denied` |

Escritas passam por `save_user`/`delete_user` (licenças, contrato disponível, último admin) e
registram `user.created/updated/deleted` (só `is_active`/excluído; nunca senha). Leituras com
queries constantes (1/31 usuários) e sem escritas.
