# Planos, contratos e organizações

Persistência implementada na etapa 2.1 em `backend/apps/contracts/models.py`.
ADRs: [0006](../adr/0006-multi-tenancy-contrato-organizacao.md),
[0007](../adr/0007-identificadores-e-convencoes-de-persistencia.md),
[0012](../adr/0012-excecoes-ao-escopo-declarado.md),
[0013](../adr/0013-dominio-de-contratos-e-relacoes-de-contexto.md) e
[0014](../adr/0014-modalidade-definida-pela-implantacao.md).

## Plan — dsc_plan

Herda `SharedModel`. Representa a oferta comercial, sem definir o servidor em
que o sistema roda. Compartilhado, dedicado e servidor próprio são escolhas
de implantação; não são campos de plano ou contrato.

| Campo | Significado |
|---|---|
| `name` | nome do plano, até 255 caracteres |
| `max_organizations` | quantidade máxima de organizações |
| `max_storage_bytes` | armazenamento máximo em bytes |
| `max_integrations` | quantidade máxima de integrações |
| `max_operations_per_month` | quantidade máxima de operações por mês |

As quatro quotas são opcionais e não têm valor padrão: `null` indica limite
não definido; zero é um limite configurado em zero. Valores negativos são
rejeitados na validação e pelo banco. Campos de bytes e operações usam BIGINT.

Somente a tabela foi preparada, conforme pedido do usuário: **não há aplicação
de quotas**, contadores de consumo, períodos de apuração ou bloqueios de uso.
Essas regras entram junto das funcionalidades correspondentes. Licenças de
usuários são configuradas no contrato, não no plano. Alterações comerciais
de contratos existentes precisarão de fluxo próprio; não há atualização
automática de contratos, cobrança ou contratação nesta etapa.

## Contract — dsc_contract

Herda `BaseModel` diretamente: é a raiz do tenant, exceção fechada do ADR 0012.

| Campo | Regra de persistência |
|---|---|
| `name` | nome do cliente, até 255 caracteres |
| `plan` | FK obrigatória para Plan, com PROTECT |
| `start_date` | início obrigatório da vigência |
| `end_date` | fim opcional; quando preenchido, deve ser igual ou posterior ao início |
| `licenses` | quantidade de licenças, obrigatória e maior ou igual a 1 |
| `post_termination_retention_days` | padrão 90 dias, intervalo 0–365 |

Datas, licenças e teto de retenção têm constraints no banco, inclusive para
updates em lote que não executem validação do model. `full_clean()` valida os
models; `save()` não o chama automaticamente, conforme o comportamento do Django.

O campo de retenção registra a configuração contratual prevista no ADR 0007;
não implementa expurgo, alertas, reativação ou LegalHold. A eliminação e as
obrigações de retenção continuam exigindo a entrega própria prevista no plano.
Não interpretar a configuração como autorização irrestrita para reter dados.

## Organization — dsc_organization

Herda `ContractScopedModel`, com FK `contract` obrigatória e PROTECT. Representa
uma filial, secretaria ou outra unidade do cliente. Tem `name` de até 255
caracteres e os campos herdados. A FK de contrato possui índice.

Os três models têm `is_active`, UUID público v7, datas, autoria explícita e
soft delete herdados. Nomes não são identificadores únicos. `__str__` usa somente
o nome local, sem consultas a relações. Soft delete não apaga dependentes;
PROTECT impede remoção física pelo ORM quando houver referências.

## Situação da entrega

- Migration `contracts.0001_initial` aplicada ao banco local autorizado.
- Nenhum plano, contrato ou organização inicial foi cadastrado.
- Sem endpoints, serializers ou serviços de contratação publicados nesta etapa.
- Vínculo de usuário, limites de licenças e regras de superadmin: etapa 2.2.
- Validação de contrato ativo/vigência e contexto: etapas seguintes.
- Isolamento automático de consultas e testes entre tenants: etapas 2.3–2.5.
  `objects` hoje filtra somente excluídos; não é uma barreira de autorização.
