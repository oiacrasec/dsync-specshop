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

As relações apontam para o futuro app `apps/contracts`, usam `PROTECT` e não
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

Esse é um exemplo para depois da criação de `Contract` e `Organization` na
etapa 2.1. Não criar esse model concreto antes dos destinos das relações.

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

## Limites desta etapa

Os tipos declaram persistência; ainda não filtram queries por tenant nem
concedem permissões. Nenhum model de negócio ou endpoint foi publicado.
Managers com contexto, validação contrato/organização, restrições de escrita,
unicidade híbrida e testes de isolamento entram nas próximas etapas do plano.
Não tratar `objects` ou `all_objects` como autorização de acesso.

Os tipos abstratos não criam tabelas ou migrations. Na etapa 2.1, `Plan` usará
`SharedModel`; `Contract` continuará como raiz do tenant e exceção do ADR 0012.
As docstrings dos quatro tipos trazem exemplos das regras de visibilidade alvo.
