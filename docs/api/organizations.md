# Organizações acessíveis

OrganizationViewSet em apps/contracts, com OrganizationSerializer; ADR 0032.
JWT obrigatório, sem exigir ou usar X-Organization-Id para escolher a organização.

| Método | Rota | Resultado |
|---|---|---|
| GET | /api/v1/admin/organizations/ | lista paginada das organizações acessíveis |
| GET | /api/v1/admin/organizations/{public_id}/ | public_id e name da organização permitida |
| GET | /api/v1/admin/organizations/options/ | seleção UUID/rótulo, conforme contrato de options |
| GET | /api/v1/admin/organizations/schema/ | metadados da listagem |

Usuário comum recebe somente organizações alcançadas por suas concessões RBAC
ativas, no próprio contrato, respeitando exceções e perfis inativos/excluídos.
Sem concessões, a lista é vazia. Superadmin pode consultar organizações
de todos os contratos não excluídos, inclusive inativos/vencidos para suporte.
Em ambos os casos, organizações inativas e excluídas não aparecem na seleção.

Listagem usa first/rows (máximo 100), search, ordering=name/-name e is_active.
contract é um filtro opcional de UUID público do contrato, aplicado somente à lista:

```http
GET /api/v1/admin/organizations/?contract=<public_id-do-contrato>&search=filial&rows=20
```

O filtro nunca amplia o conjunto autorizado; outro contrato retorna lista vazia
ao usuário comum. Como apenas organizações ativas são elegíveis, is_active=false
retorna vazio. Query inválida retorna 422 RFC 9457; detalhe sem acesso retorna 404.
POST/PUT/PATCH/DELETE retornam 405. CRUD de gestão continua na etapa 5.4.

Resposta de lista: {"data": [{"public_id": "UUID", "name": "Filial"}], "total_records": 1}.
Headers incluem X-Request-Id e Cache-Control sem cache. Options mantém os parâmetros
q/public_id/first/rows; filtro contract é da lista, não de options.

Substitui GET /api/v1/admin/contracts/{public_id}/organizations/, agora 404.
GET /api/v1/me/organizations/ permanece disponível com sua resposta existente.

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

Usuário com perfil: três consultas de concessões, COUNT e página (cinco SELECTs),
constantes com 1/30 organizações, em list/options. Querysets filtram no banco,
selecionam somente campos necessários e materializam no máximo 100 registros.
Testes não observaram INSERT/UPDATE/DELETE nem FOR UPDATE nas leituras.
Superadmin usa COUNT/página sem carregar concessões. Não há consulta por item.
Busca/COUNT/OFFSET podem crescer com o volume; evidência sem JWT real ou ensaio
de carga nesta revisão, não certifica capacidade. Avaliar volume/concorrência real.
