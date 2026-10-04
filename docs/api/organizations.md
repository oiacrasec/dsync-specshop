# Organizações do usuário (API v1)

Etapa 3.5, conforme ADR 0009 §6 e ADR 0006 §3.1. Lista as organizações que o
usuário pode usar no header `X-Organization-Id`, para a troca de contexto.

| Método e rota | Contexto | Sucesso |
|---|---|---|
| `GET /api/v1/me/organizations/` | não exige `X-Organization-Id` | 200, lista ordenada por nome |

```json
[{"public_id": "0199...", "name": "Secretaria de Obras"}]
```

| Regra | Detalhe |
|---|---|
| A atribuição é o acesso | entra na lista a organização alcançada por alguma atribuição ativa (perfil ativo ou permissão avulsa): escopo do contrato menos as exceções, ou a própria organização |
| Mesma regra do header | só organizações ativas e não excluídas do contrato do usuário |
| Superadmin | lista vazia; escolhe contrato → organização pela área administrativa (bloco 5) |
| Sem login | 401 (RFC 9457) |
| Cache | `Cache-Control: no-cache, no-store` (resposta por usuário) |

Sem paginação nesta etapa. Contrato vencido/inativo a cada requisição fica na etapa 2.3.
