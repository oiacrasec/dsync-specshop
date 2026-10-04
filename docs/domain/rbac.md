# Gestão de acesso — RBAC

Etapa 3.2 do [plano](../plans/entrega-1-fundacao-tenancy-rbac.md), conforme
[ADR 0009](../adr/0009-rbac-hibrido.md) e [ADR 0016](../adr/0016-dominio-rbac.md).
Implementação em `backend/apps/rbac`, sem endpoints publicados nesta etapa.

## Persistência

| Model / tabela | Escopo de persistência | Papel |
|---|---|---|
| Profile / dsc_profile | HybridScopedModel | Perfil de sistema (contract nulo) ou do cliente |
| ProfilePermission / dsc_profile_permission | HybridScopedModel | Código do registry ligado ao perfil, no mesmo contexto |
| Assignment / dsc_assignment | ContractScopedModel | Perfil ou permissão avulsa concedida a um usuário |
| AssignmentExclusion / dsc_assignment_exclusion | ContractScopedModel | Organização excluída de uma atribuição de contrato |

Todas as tabelas possuem UUID v7 público, autoria explícita, is_active e soft delete.
FKs do domínio usam PROTECT. `objects` oculta excluídos e mantém inativos.

Assignment usa exatamente um perfil ou uma permissão avulsa. CONTRACT exige
scope_organization nulo; ORGANIZATION exige uma organização do mesmo contrato.
scope_organization é o destino da concessão; excluded_organization é seu alvo
de exceção. Ambos são distintos do contexto de persistência do registro, que é
sempre o contrato. Não são campos organization do OrganizationScopedModel.

Exemplo: Maria recebe Leitor no contrato inteiro, com exceção da Matriz. Essa
atribuição não alcança a Matriz, mas outra atribuição pode conceder acesso a ela.
A exceção não é uma negação global de permissão.

Constraints impedem duplicados não excluídos, escopos inconsistentes e concessões
sem alvo ou com dois alvos. A unicidade de perfis do sistema e atribuições trata
NULL como igual, usando
[nulls_distinct=False](https://docs.djangoproject.com/en/5.2/ref/models/constraints/#nulls-distinct).
Relações entre contratos e códigos do registry são validados pelos services.

## Leituras e escritas

selectors.py concentra existência de nomes conflitantes, UUIDs de contratos com
nomes duplicados e existência de atribuições de um perfil. O aviso de duplicados
retorna QuerySet lazy e ordenado, para futura paginação, sem carregar tudo.

services.py concentra save/delete de perfil, permissão, atribuição e exceção.
Atualmente exige ator superadmin ativo e não excluído, consultado novamente no
banco; administração pelo cliente depende da autorização da etapa 3.3.

- Perfil do cliente não repete nome de outro perfil do próprio contrato ou do
  sistema. Nomes em contratos diferentes são permitidos. Comparação atual é exata.
- Superadmin pode criar perfil do sistema com nome já usado por clientes; recebe
  os UUIDs dos contratos afetados como aviso. Dois perfis de sistema iguais são bloqueados.
- Contexto de perfil e atribuição existentes não pode mudar. Permissão não muda
  de perfil; exceção não muda de atribuição.
- Permissões desconhecidas ou reservadas são rejeitadas em perfis comuns e avulsas.
  O escopo é validado ao atribuir e ao adicionar uma permissão ao perfil já atribuído.
- Usuário deve ser comum e do mesmo contrato. Usuário inativo pode ter atribuições;
  isso não o autentica nem concede acesso efetivo nesta etapa.
- Exceções exigem atribuição CONTRACT e organização ativa do mesmo contrato.
  Remover exceções antes de converter a atribuição para ORGANIZATION.
- Perfil atribuído, inclusive por uma atribuição inativa, não pode ser excluído:
  ProfileInUse (409). Exclusão lógica de perfil remove suas permissões; exclusão
  lógica da atribuição remove suas exceções, com autoria e na mesma transação.
- save_user bloqueia transferência de contrato enquanto houver atribuições não
  excluídas. Removê-las primeiro, para não deixar concessões inconsistentes.

Escritas RBAC usam atomic e um
[advisory lock transacional PostgreSQL](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS)
fixo para serializar a configuração, incluindo conflitos de nomes entre sistema
e cliente. O lock é global às escritas RBAC, liberado em commit/rollback; não
participa de leituras de acesso. Assignment também bloqueia o usuário, coordenando
com transferências. É um custo de concorrência administrativa a reavaliar se
houver contenção; não há lock em cada permissão ou consulta dentro do loop.

As 22 consultas de criação de atribuição com perfil incluem full_clean e seus
savepoints. Testes provam quantidade constante para 1 e 30 permissões.
Índice composto contract/user e índices de FKs apoiam as consultas.

Não escrever via save/update/bulk direto em fluxos de gestão: as constraints não
substituem regras entre tabelas. Fixtures/migrations controladas são a exceção
para manutenção do perfil essencial. Os services atuais usam o banco padrão.

## Permissão efetiva e autorização da API (etapa 3.3)

| Peça | Onde | Regra |
|---|---|---|
| Cálculo | `apps/rbac/evaluation.py` (Python puro) | concessões que alcançam a organização: CONTRACT alcança todas menos as exceções; ORGANIZATION só a própria. Resultado = união dos códigos do registry permitidos no escopo da concessão |
| Leitura | `selectors.user_grants` | atribuições e perfis **ativos** e não excluídos, do contrato do usuário, em 3 queries constantes. Exceções não excluídas restringem mesmo inativas (falha fechada) |
| Contexto mínimo | `apps/core/context.py` | header `X-Organization-Id`: ausente/malformado → 400 `context-invalid-request`; organização inexistente, excluída, inativa ou de outro contrato → 403 `context-forbidden`. Preenche `request.organization` |
| DRF | `apps/rbac/permissions.py` | padrão global `IsAuthenticated` + `RequiredPermission`: a view declara `required_permission` (código ou dicionário por action/método); sem declaração ou código fora do registry → negado. `AllowAuthenticated` é a marca explícita de endpoint aberto a autenticados |

| Situação | Resposta |
|---|---|
| Nenhuma concessão alcança a organização | 403 `context-forbidden` |
| Acessa a organização, mas não tem o código | 403 `permission-denied` |
| Perfil essencial (`contract_admin`) | todos os códigos do registry, inclusive os criados depois |
| Superadmin | passa sem organização; organização opcional fica na etapa 2.3 |

O cálculo é feito uma vez por requisição. Contrato vencido/inativo a cada
requisição e superadmin com organização opcional ficam na etapa 2.3.

## Perfil essencial e etapas seguintes

system_key='contract_admin' identifica o Administrador do contrato. Só pode existir
em perfil do sistema, com chave única reservada mesmo após exclusão lógica.
Services não criam, editam nem excluem esse perfil ou suas permissões.
Pode receber atribuição CONTRACT, sem exceções.

A migration rbac.0001 cria as tabelas; a rbac.0002 (dados, idempotente) cria o perfil
essencial "Administrador do contrato" e o restaura se estiver excluído ou inativo.
Não concede acesso a ninguém: o superadmin atribui o perfil.

### Último administrador (etapa 3.4)

Administrador ativo = atribuição essencial ativa, perfil ativo e usuário ativo e não
excluído. Depois que o contrato tem o primeiro, nenhuma operação pode zerar a contagem;
a regra vale também para o superadmin → 409 `last-contract-admin`.

| Operação | Service |
|---|---|
| Remover, desativar ou trocar o perfil da atribuição essencial | `save_assignment` / `delete_assignment` |
| Desativar o usuário | `save_user` |
| Excluir o usuário (soft delete) | `delete_user` (nunca `user.delete()`) |

Concorrência: a checagem bloqueia a linha do contrato (`select_for_update`), na ordem
usuário → contrato; teste com duas threads prova que sobra um administrador.
Contrato ainda sem administrador continua permitido até o primeiro ser nomeado.

O acesso total dinâmico do perfil essencial vale no cálculo (3.3);
organizações acessíveis em 3.5;
auditoria de eventos em 3.6. Autoria nos models não substitui essa trilha.
O restante do contexto e o isolamento automático de queries continuam nas etapas 2.3–2.5.

## Dados e finalidade

Os vínculos reutilizam usuário, contrato e organização para administrar o acesso
necessário à prestação do serviço, conforme o domínio e as retenções já definidos
nos ADRs 0006/0007. Sem novos dados cadastrais, dados sensíveis, logs de payloads,
envio a terceiros ou retenção adicional. Soft delete preserva registros e não é
eliminação legal; expurgo e políticas permanecem na entrega própria.
