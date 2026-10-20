# Perfis e catálogo de permissões

Área do cliente (etapa 8.2, decisões 54 e 57). Gestão **reservada** ao administrador do contrato
(perfil essencial, ADR 0009 §3.1); superadmin com `X-Organization-Id` também pode. Todas as rotas
exigem o header de uma organização acessível (400/403 como nos endpoints de negócio).

## Catálogo

`GET /api/v1/permissions/` (qualquer usuário autenticado) devolve o registry agrupado por recurso,
com rótulos para a interface (pela ação; `user:manage` aparece como "Redefinir senha"). Não autoriza nada.

```json
[{"resource": "user", "label": "Usuários", "permissions": [
  {"code": "user:view", "action": "view", "label": "Visualizar", "scopes": ["CONTRACT"], "reserved": true}
]}]
```

## Perfis

| Método | Rota | Permissão (reservada) |
|---|---|---|
| GET | `/api/v1/profiles/`, `{public_id}/`, `options/`, `schema/` | `profile:view` |
| POST | `/api/v1/profiles/` | `profile:create` |
| PUT / PATCH | `/api/v1/profiles/{public_id}/` | `profile:update` |
| DELETE | `/api/v1/profiles/{public_id}/` | `profile:delete` |

Lista os perfis do contrato e os do sistema (`is_system=true`, só leitura; o essencial tem
`is_essential=true` e mostra todos os códigos do registry). Perfis de outro contrato → 404.
Campos: `name`, `is_active`, `permissions` (códigos do registry); saída também com `public_id`,
`is_system`, `is_essential`, `created_at`, `updated_at`. Listagem: `search` (nome), `is_active`,
`ordering` (`name`, `created_at`, `updated_at`). `permissions` em PATCH substitui o conjunto.

| Regra | Resposta |
|---|---|
| Código reservado ou fora do registry | 422 |
| Nome vazio, repetido no contrato ou igual a um perfil do sistema | 422 |
| Alterar perfil do sistema | 403 |
| Excluir perfil em uso por atribuição | 409 `profile-in-use` |
| Sem a permissão reservada | 403 `permission-denied` |

Escritas passam pelos services de RBAC (`save_profile`, `delete_profile`,
`save_profile_permission`, `delete_profile_permission`): autorização no próprio contrato,
escopos das atribuições existentes e auditoria. Lista com queries constantes (1/26 perfis).
