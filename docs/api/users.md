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
| GET | `/api/v1/users/{public_id}/access/` | `user:view` |
| PUT | `/api/v1/users/{public_id}/access/` | `assignment:create` |

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

## Acesso do usuário (aba Permissões, etapas 8.3–8.4, decisões 58–60, 63 e 64)

`GET …/access/` devolve tudo o que a aba precisa: `organizations` (do contrato, com `is_active`),
`profiles` (do contrato e do sistema, com `is_essential` e `permissions`; o essencial traz todos os
códigos do registry) e `grants`. Cada concessão: `scope` (`CONTRACT`/`ORGANIZATION`), `organization` (só no escopo de
organização), `profile` **ou** `permission`, `excluded_organizations` (só CONTRACT),
`excluded_permissions` (só perfil: `[{"organization": uuid|null, "permission": código}]`, ADR 0038;
`organization` só no CONTRACT, null = em todo lugar) e `is_active`.

`PUT …/access/` recebe `{"grants": [...]}` (até 500) e **substitui** o conjunto inteiro numa
transação; responde como o GET. O perfil é vinculado (ADR 0009 §2): mudar o perfil muda o acesso
de quem o tem. Administrador do contrato = concessão do perfil essencial no escopo CONTRACT, sem
exceções (como qualquer perfil, pelo seletor da aba).
Só grava o que mudou (cria e reativa antes de excluir), com auditoria `assignment.*`/`exclusion.*`.

| Regra | Resposta |
|---|---|
| Perfil **e** permissão, ou nenhum; organização fora do escopo de organização; exceção fora do contrato | 422 |
| Código reservado, fora do registry ou em escopo não permitido; perfil incompatível com o escopo | 422 |
| Organização ou perfil de outro contrato; essencial fora do CONTRACT ou com exceção | 422 |
| Exceção de permissão em avulsa, fora do registry, ou com organização numa concessão de organização | 422 |
| Tirar o último administrador ativo | 409 `last-contract-admin` |
| Usuário de outro contrato | 404 |

GET com queries constantes (organizações, perfis + permissões, atribuições + exceções). O PUT
custa por item alterado (services de RBAC com o lock de configuração), limitado a 500 concessões.
