# 0032 — Organizações em ViewSet próprio

- **Status:** Proposto — revisão pendente (usuário vai ajustar o escopo depois da área administrativa;
  hoje expõe `/admin/organizations/` ao usuário comum e acesso global ao superadmin)
- **Data:** 2026-10-04
- **Complementa:** ADRs 0009, 0020 e 0021; substitui a rota aninhada do ADR 0020.

## Contexto

O usuário decidiu remover organizations de ContractViewSet e publicar um
OrganizationViewSet próprio que respeite as organizações acessíveis ao usuário.
O endpoint anterior era de leitura para entrada do superadmin; o CRUD de gestão
continua previsto na etapa 5.4, com permissões reservadas do administrador do contrato.

## Decisão

- OrganizationViewSet herda BaseReadOnlyModelViewSet, com recursos padrão do DRF
  para list/retrieve, django-filter, paginação, options/schema compartilhados.
- Rota /api/v1/admin/organizations/; listagem aceita contract como UUID público.
  Registrada no mesmo SchemaRouter de plans/contracts, conforme ajuste do usuário;
  o prefixo admin não substitui a autorização específica pelo queryset RBAC.
  Removida /api/v1/admin/contracts/{public_id}/organizations/.
- OrganizationSerializer expõe somente public_id e name. Sem create/update/delete
  nesta revisão. /api/v1/me/organizations/ mantém seu contrato existente.
- AllowAuthenticated vincula o contrato, sem exigir X-Organization-Id. A autorização
  dos registros ocorre no queryset: accessible_organizations reutiliza as regras
  RBAC existentes de atribuições/perfis ativos, escopo e exceções. Filtros nunca
  ampliam esse conjunto; detalhe sem acesso retorna 404, sem revelar existência.
- O superadmin pode ler organizações ativas de contratos não excluídos, inclusive
  contratos inativos/vencidos para suporte. Seu queryset global é declarado com
  unscoped e clonado por requisição. Usuário comum não utiliza esse queryset global.
- Organizações inativas/excluídas continuam fora da seleção, conforme regra atual
  de entrada. List/retrieve/options compartilham o conjunto autorizado; schema
  publica somente metadados. Responses não são armazenáveis em cache.
- Filtro contract pertence à listagem; options mantém q/public_id/first/rows do
  contrato existente. Para o fluxo contrato → organização, usar a lista com contract.

## Alternativas consideradas

Manter a action aninhada repetia processamento da listagem e limitava o endpoint
ao superadmin. Aplicar somente o manager do contrato não respeitaria exclusões e
atribuições de organização. RequiredPermission de contexto ativo impediria a
seleção anterior à entrada; o queryset RBAC faz essa autorização explicitamente.

## Consequências

Frontend troca a rota antiga pela lista independente com filtro contract.
O conjunto permitido é filtrado no banco; leituras não auditam entrada em contexto
nem escrevem logs. A entrada efetiva pelo header continua no mecanismo existente.
CRUD de gestão requer a etapa própria e suas permissões, não é concedido por esta leitura.
