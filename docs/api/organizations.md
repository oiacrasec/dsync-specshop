# Organizações

Organizações ficam só na área do cliente ([ADR 0037](../adr/0037-organizacoes-na-area-do-cliente.md)).
A rota administrativa `/api/v1/admin/organizations/` (ADR 0032) foi removida na etapa 7.1 e
responde 404. O CRUD da área comum e o resumo de permissões entram nas etapas 7.2–7.3.

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
