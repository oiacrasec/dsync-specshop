# Resumo de permissões

`GET /api/v1/me/permissions/` (etapa 7.2, [ADR 0037](../adr/0037-organizacoes-na-area-do-cliente.md))
devolve os códigos do registry que o usuário tem na **organização ativa**, para a interface
mostrar menus e botões. Não autoriza nada: cada endpoint revalida a permissão (ADR 0009 §4).

```http
GET /api/v1/me/permissions/
Authorization: Bearer <access>
X-Organization-Id: <public_id da organização>
```

```json
{"permissions": ["organization:update", "organization:view"]}
```

| Situação | Resposta |
|---|---|
| Concessões que alcançam a organização | 200, códigos em ordem alfabética |
| Perfil essencial (admin do contrato) ou superadmin | 200, todos os códigos do registry |
| Header ausente ou malformado | 400 `context-invalid-request` |
| Organização inexistente, inativa, de outro contrato ou sem concessão | 403 `context-forbidden` |
| Sem autenticação | 401 |

Mesmo contexto e cálculo dos endpoints de negócio (`resolve_organization` + `access_evaluation`),
uma vez por requisição. Resposta `no-store`. Custo: as três consultas de concessões mais a
resolução da organização, constantes com 1/30 organizações e concessões; sem escritas.
O cliente busca uma vez por organização ativa e guarda em memória; trocar de organização recarrega.
