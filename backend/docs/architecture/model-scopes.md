# Escopos de persistência

Implementação da etapa 1.2, conforme os ADRs
[0006](../../../docs/adr/0006-multi-tenancy-contrato-organizacao.md),
[0012](../../../docs/adr/0012-excecoes-ao-escopo-declarado.md) e
[0013](../../../docs/adr/0013-dominio-de-contratos-e-relacoes-de-contexto.md).

## Escolha do tipo

Todos os tipos ficam em `apps.core.models` e herdam os campos, a autoria e o soft
delete do `BaseModel`. Escolha exatamente um:

| Tipo | Exemplo | Campos de contexto |
|---|---|---|
| `SharedModel` | país, cidade, plano | nenhum |
| `HybridScopedModel` | categoria padrão ou categoria do cliente | `contract` opcional; nulo significa sistema |
| `ContractScopedModel` | catálogo de produtos compartilhado pelas filiais | `contract` obrigatório |
| `OrganizationScopedModel` | entrada de estoque e seus itens | `contract` e `organization` obrigatórios |

O padrão para dados de negócio é `OrganizationScopedModel`. Entidades filhas
também guardam o contexto; não o deduzem pelo pai. As FKs têm índice individual;
esse tipo também fornece índice composto `(contract, organization)`.

As relações apontam para o app `apps/contracts`, usam `PROTECT` e não
criam acessores reversos (`related_name='+'`). `PROTECT` impede remoção física
pelo ORM quando há dependentes; o soft delete continua sem cascata.

Ao personalizar `Meta`, herde a do tipo escolhido e defina `abstract = False`.
Isso preserva os managers e os índices; ao adicionar índices, inclua os herdados:

```python
class StockEntry(OrganizationScopedModel):
    class Meta(OrganizationScopedModel.Meta):
        abstract = False
        verbose_name = _('entrada de estoque')
```

`Contract` e `Organization` já existem desde a etapa 2.1. O exemplo ilustra
um futuro model de estoque, que ainda não foi criado.

## System check

`apps.core.checks` é registrado pelo `CoreConfig.ready()`. `manage.py check`
inspeciona os models de apps próprios (`AppConfig.name` iniciado por `apps.`),
incluindo proxies e models unmanaged. Apps de terceiros e tabelas N:N automáticas
não são submetidos ao contrato dos nossos models.

| Código | Problema |
|---|---|
| `core.E001` | model próprio sem tipo de escopo |
| `core.E002` | herança de mais de um tipo de escopo |
| `core.E003` | campos de contexto removidos ou alterados de forma incompatível |

O check valida os destinos das FKs, `null`, `blank` e `PROTECT`; também rejeita
campos de contexto em tipos que não os admitem. A lista de exceções é fechada:
`users.User` e `contracts.Contract`, herdando `BaseModel` sem tipo de escopo.
O nome simples da classe não concede exceção. Novas exceções exigem novo ADR.

O check usa apenas metadados, sem queries. No deploy, executar `manage.py check`
explicitamente: o Django não executa os checks na inicialização WSGI.
Referência: [system checks do Django](https://docs.djangoproject.com/en/5.2/topics/checks/).

## Contexto e managers (etapa 2.4)

Camadas B a E do ADR 0006 §1.3:

| Camada | Peça | Regra |
|---|---|---|
| C. Contexto | `apps/core/tenancy.py` | `contextvar` com contrato, organização e superadmin. `TenantContextMiddleware` (`apps/core/middleware.py`) começa cada requisição sem contexto; `AllowAuthenticated`/`RequiredPermission` gravam o contrato do usuário e o header grava a organização. Fora de requisição: `use_context(...)`, `system_context()` ou `@system_scope` |
| B. Manager | `objects` e `all_objects` | filtram pelo contexto; sem contexto → `TenantContextMissing` (500, nunca dados). Global só por `.unscoped()`. `_base_objects` (sem filtro) é o manager base do Django, para seguir FKs |
| D. View | `apps/core/mixins.TenantScopedViewMixin` | `model` em vez de `queryset`; create/update gravam `contract`/`organization` do contexto e autoria, ignorando o payload; fora do contexto → 404; registro do sistema (Hybrid) → 403 para cliente |
| E. Serializer | `apps/core/serializers.ScopedModelSerializer` | FKs por `public_id` com o manager com escopo (outro contrato → "não existe", 422); sem `id`, `contract` e `organization` |

| Contexto | Shared | Hybrid | Contract | Organization | `Contract` / `User` |
|---|---|---|---|---|---|
| nenhum | todos | erro | erro | erro | erro |
| contrato (usuário comum) | todos | sistema + próprio | próprio | erro | só o próprio / só do contrato |
| contrato + organização | todos | sistema + próprio | próprio | própria organização | idem |
| superadmin sem organização | todos | erro (`unscoped()`) | erro | erro | erro |
| `system_context()` | todos | todos | todos | todos | todos |

Superadmin com header age como o cliente daquela organização. Services de integridade
(`save_user`, `delete_user`, RBAC, login/refresh/logout) rodam em `@system_scope`: a
autorização fica em quem chama. Testes usam `system_context()` automático no `conftest`;
o app só de testes `apps/core/tests/scoping` tem um model de cada tipo.

## Testes de isolamento (camada F, etapa 2.5)

`apps/core/tests/test_isolation.py` percorre **todo** model concreto de `apps.*`:

| Teste | Garante |
|---|---|
| cobertura | todo model tem fábrica em `FACTORIES` ou está em `SHARED`; model novo sem fábrica quebra a suíte |
| outro contrato | no contexto de A, `objects` e `all_objects` não acham registros de B (nem excluídos), por pk, `public_id`, `get` ou `values_list` |
| outra organização | model com escopo de organização não enxerga a organização irmã do mesmo contrato |
| Hybrid | registro do sistema visível; o de outro cliente, não |
| fail closed | sem contexto ou superadmin sem organização → `TenantContextMissing`; `unscoped()` é o único global |
| Shared | visível em qualquer contexto |

Ao criar model com escopo, registre a fábrica no mesmo commit. O teste foi validado
com mutação (filtro de contrato desligado → 5 falhas).

Os tipos abstratos não criam tabelas ou migrations. Desde a etapa 2.1, `Plan` usa
`SharedModel`, `Organization` usa `ContractScopedModel` e `Contract` permanece
como raiz do tenant e exceção do ADR 0012; esses concretos têm migration própria.
As docstrings dos quatro tipos trazem exemplos das regras de visibilidade alvo.

## Credenciais de 2FA (ADR 0041, etapa 9.4 em implementação)

UserMfa, UserRecoveryCode e UserMfaChallenge são registros técnicos da conta,
antes do tenant, como UserSession. Constam em UNSCOPED_RECORDS/OWNER_ONLY;
sem CRUD genérico, consultas/ações filtradas pelo dono e testes de isolamento.
Não são novos tipos de escopo para dados de negócio.
