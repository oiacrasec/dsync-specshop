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
| `plan` | FK opcional para Plan, com PROTECT quando vinculada; null = sem plano |
| `start_date` | início obrigatório da vigência |
| `end_date` | fim opcional; quando preenchido, deve ser igual ou posterior ao início |
| `licenses` | quantidade de licenças, obrigatória e maior ou igual a 1 |
| `post_termination_retention_days` | padrão 90 dias, intervalo 0–365 |

Datas, licenças e teto de retenção têm constraints no banco, inclusive para
updates em lote que não executem validação do model. `full_clean()` valida os
models; `save()` não o chama automaticamente, conforme o comportamento do Django.

Na etapa 6.3, plan passou a aceitar null/omissão (ADR 0033). Sem plano não há quotas
de plano configuradas; licenças continuam definidas e validadas no contrato.
A migration contracts.0003_contract_plan_optional mantém os vínculos existentes.

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
- API administrativa de planos/contratos publicada na etapa 5.2 e movida para
  apps/administration na 6.3; models permanecem em contracts. CRUD auditado pelo
  serializer base; contrato em [administração](../api/admin-contracts.md).
  Não implementa contratação comercial, cobrança ou assinatura.
- Vínculo de usuário e regras de licenças: etapa 2.2 concluída, conforme
  [ADR 0015](../adr/0015-contagem-de-licencas-de-usuarios.md).
- Contrato ativo/vigência conferido no login, refresh e a cada requisição: etapa 2.3 (abaixo).
- Isolamento automático de consultas e testes entre tenants: etapas 2.4–2.5.
  `objects` hoje filtra excluídos e contexto, falhando sem tenant; acesso global
  administrativo é explícito e autorizado apenas ao superadmin.

## Usuários e licenças

`User.contract` é uma FK PROTECT, indexada. A constraint
`dsc_user_contract_by_role` exige contrato para usuário comum e proíbe contrato
para superadmin, inclusive em inserts/updates diretos. O vínculo identifica
o cliente ao qual o usuário pertence, para prestação do serviço e isolamento.

Ativos e inativos não excluídos ocupam vaga. Soft delete libera; restauração e
transferência precisam de vaga no destino. Editar/reativar um usuário já contado
não ocupa outra vaga. Superadmin não consome licença de cliente.

`apps.users.services.save_user(user=..., actor=...)` é a escrita interna central,
com transação e locks no usuário existente e no contrato de destino. Conta vagas
no banco, verifica contrato disponível/ativo e vigência (início e fim inclusivos),
e grava autoria explícita. Falta de vaga gera `LicenseLimitReached` (409).
Contrato inativo, vencido ou futuro gera `ContractInactive` (403); ausente ou
excluído gera validação (422), pelo handler global nos futuros endpoints.

## Contrato disponível a cada requisição (etapa 2.3)

`Contract.is_available()`: ativo, não excluído e dentro da vigência (início e fim
inclusivos). Usuário comum com contrato indisponível recebe 403 `contract-inactive`:

| Momento | Regra |
|---|---|
| Login | só depois da senha correta (senha errada continua 401, sem revelar o contrato) |
| Refresh | negado; o token continua válido e volta a funcionar se o contrato for reativado |
| Rotas autenticadas | conferido na autenticação JWT, na mesma query do usuário |
| Logout | continua permitido |

O frontend encerra a sessão ao receber `contract-inactive`. Superadmin não tem
contrato e não é afetado.

`create_user`/`create_superuser` e suas versões assíncronas delegam a essa escrita,
preservando normalização e hash do Django. `createsuperuser` continua sem contrato.
Não usar save/update/bulk/SQL direto para criar vagas, mudar vínculo ou restaurar:
a constraint não impõe o limite agregado. Operações internas controladas de
fixtures/migrations devem garantir as regras explicitamente.

O serviço não é endpoint e não decide quem pode cadastrar, promover ou transferir
usuários. Autorização, atribuições e auditoria completa entram nas etapas de RBAC
e gestão de usuários. Não expor esse serviço por uma API sem essas proteções.
Desde a etapa 3.2, transferir de contrato exige remover as atribuições RBAC não
excluídas primeiro, inclusive as inativas, para manter coerência entre os vínculos.
Bloqueio de login/refresh e requisições por contrato indisponível será conectado
na etapa de validação de contexto; esta etapa valida o contrato nas escritas.
