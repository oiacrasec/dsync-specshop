# Organizações

Organizações ficam só na área do cliente ([ADR 0037](../adr/0037-organizacoes-na-area-do-cliente.md)).
A rota administrativa `/api/v1/admin/organizations/` (ADR 0032) foi removida na etapa 7.1 e
responde 404.

## Gestão na área do cliente (7.3)

| Método | Rota | Permissão |
|---|---|---|
| GET | `/api/v1/organizations/` (lista), `{public_id}/`, `options/`, `schema/` | `organization:view` |
| POST | `/api/v1/organizations/` | `organization:create` (concedida em qualquer escopo; cria no contrato) |
| PUT / PATCH | `/api/v1/organizations/{public_id}/` | `organization:update` |
| DELETE | `/api/v1/organizations/{public_id}/` | `organization:delete` (soft delete) |

Todas exigem `X-Organization-Id` de uma organização acessível (400/403 como nos endpoints de
negócio). A permissão concedida em **qualquer** escopo vale para **todas** as organizações do
contrato (decisões 47 e 50; `ContractWidePermission`). Admin do contrato e superadmin com
header podem tudo. Registros de outro contrato → 404.

Campos: `name` (obrigatório, até 255), `is_active`; saída também com `public_id`, `created_at`,
`updated_at`. O contrato vem do contexto; `contract` no payload é ignorado. Listagem `first`/`rows`,
`search` (nome), `is_active`, `ordering` (`name`, `created_at`, `updated_at`).

| Regra | Resposta |
|---|---|
| Nome repetido no contrato, sem diferenciar maiúsculas (excluídas não contam) | 422 em `errors.name` (decisão 53) |
| Desativar ou excluir a única organização ativa | 409 [`last-active-organization`](errors/last-active-organization.md) (decisão 52) |
| Excluir organização que é escopo de atribuição ou alvo de exceção | 409 [`organization-in-use`](errors/organization-in-use.md) (decisão 51) |

Escritas bloqueiam a linha do contrato (nome único e "pelo menos uma ativa" sob concorrência) e
registram `organization.created/updated/deleted` na mesma transação, sem o nome no JSON.
Leituras: queries constantes com 2/32 organizações, sem escritas. Plano: quotas de
`max_organizations` continuam sem enforcement.

## Lista do usuário para troca de contexto

GET /api/v1/me/organizations/ (etapa 3.5, ADRs 0009 §6 e 0006 §3.1) permanece sem
paginação e sem exigir X-Organization-Id. Retorna uma lista ordenada por nome:

```json
[{"public_id": "0199...", "name": "Secretaria de Obras"}]
```

A atribuição ativa concede acesso: perfil ativo ou permissão avulsa, no escopo do
contrato menos exceções, ou na própria organização. Somente organizações ativas e
não excluídas do contrato do usuário, com a mesma regra aplicada na entrada pelo header.
Superadmin recebe lista vazia nesse endpoint e usa a área administrativa para escolher
contrato/organização. Sem login: 401 RFC 9457. Contrato indisponível: 403
contract-inactive (etapa 2.3). Cache-Control: no-cache, no-store.

## Performance

`/me/organizations/`: três consultas de concessões e uma de organizações, constantes com 1/30
organizações, sem escritas ou locks. Sem ensaio de carga; não certifica capacidade.
