# 0030 — CRUD auditado com serializers padrão do DRF

- **Status:** Aceito
- **Data:** 2026-10-04
- **Substitui:** ADRs 0023, 0024 e 0025; complementa 0002 e 0020.

## Contexto

PlanService e ContractService repetiam persistência já fornecida pelo DRF.
O usuário decidiu usar ModelSerializer para o CRUD, mantendo autoria/auditoria
na base e regras próprias no validate() de cada recurso. Também dispensou
full_clean genérico e a configuração adicional model_validation_fields/exclude.

## Decisão

- BaseModelSerializer herda ScopedModelSerializer e chama super().create/update.
  Define autoria explicitamente e registra AuditEvent na mesma transação.
- BaseAdminModelSerializer usa system_context e exige superadmin ativo não excluído;
  revalida o ator no banco antes da escrita. A base comum preserva o tenant.
- audit_fields é uma lista explícita; audit_events declara criação/alteração/exclusão.
  Evento ausente falha e desfaz a escrita. Senhas, tokens e nomes não entram no estado.
  A base resolve contract_id da auditoria: PK do próprio Contract, contract_id nos
  registros vinculados e None nos compartilhados, sem sobrescrita no recurso.
- create_extra(validated_data) e update_extra(instance, validated_data) permitem
  ajustes antes do super; não persistem a instância. M2M padrão continua com o DRF.
- Campos usam validação padrão do DRF; validate() reúne regras próprias. Contract
  verifica vigência, disponibilidade do plano recebido e capacidade de licenças.
  Constraints do banco continuam como garantia de integridade.
- Validação e gravação precisam ocorrer na mesma transaction.atomic.
  ATOMIC_REQUESTS cobre o ciclo HTTP; BaseModelViewSet adquire select_for_update
  somente no registro de update/delete antes de validar. O serializer reutiliza
  esse lock, evitando recarregar o registro. Uso direto sem view recarrega com lock
  na validação e exige atomic externo envolvendo is_valid/save.
- O plano recebido é bloqueado/verificado separadamente. FK histórica para plano
  excluído permanece válida quando não enviada. Redução de licenças conta ativos e
  inativos não excluídos, com o mesmo lock de contrato da criação de usuários.
- SerializerDeleteMixin chama serializer.delete(): soft delete, autoria e auditoria
  atômicos. Não há cascata, registry de services nem delete_service por recurso.
- Removidos BaseModelService, PlanService/ContractService e seu registro no ready.
  Services de autenticação, users, RBAC e operações próprias permanecem.

## Alternativas consideradas

Manter classes de services para CRUD simples acrescentava uma camada repetitiva.
Full_clean genérico repetia validações e introduzia configuração adicional; o DRF
valida campos, e regras entre campos são explícitas no serializer. Validar capacidade
antes da transação permitiria corrida com cadastro de usuários, por isso o lock
precede a validação e permanece até o término da gravação.

## Consequências

Views continuam declarativas; contratos HTTP, escopo e auditoria são preservados.
Uso direto precisa respeitar o ciclo transacional documentado. Novas regras entre
campos exigem validate() explícito e testes; não há validação automática das
constraints do model antes da escrita. Leituras não adquirem locks nem gravam.
