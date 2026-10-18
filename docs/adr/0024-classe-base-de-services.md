# 0024 — Classe base de services e exclusão herdada nas views

- **Status:** Substituído por 0030
- **Data:** 2026-10-04
- **Complementa:** ADRs 0021 e 0023

## Contexto

Usuário determinou manter comportamentos comuns na base, como no Spatial, sem
delete_service por recurso. Também pediu classe padronizada de services no core
para herança, com delete_instance dentro dela.

## Decisão

- BaseModelService em core/services define save_instance e implementa delete_instance
  como método de classe. Save depende das regras do domínio; sem implementação falha.
- Exclusão herdada aplica autorização, transação, lock por PK, estado anterior,
  soft delete com ator explícito e auditoria. Hooks authorize/state/audit_delete
  falham se não implementados; write_scope preserva contexto por padrão.
- BaseContractService compartilha autorização de superadmin e auditoria administrativa,
  com contexto de sistema explícito. PlanService/ContractService definem model/evento
  e implementam save_instance preservando regras, licenças e locks existentes.
- Classes registradas explicitamente por model no AppConfig.ready, sem consultas.
  BaseModelViewSet delega ao BaseModelService, que seleciona o service registrado.
  Model desconhecido e instância incompatível falham antes da escrita.
  Não descobrir funções por nome nem usar ORM direto como fallback.
- Serializers continuam chamando save_instance em create/update via save_service.
  Exclusão continua no mixin da view; não há serializer.delete no DRF.

## Consequências

- Views de Plan/Contract não declaram delete_service; regras compartilhadas ficam
  em classes base e recursos declaram suas diferenças.
- Registro uma vez por classe no app, sem custo SQL na inicialização.
- Despacho em memória por tipo; sem consultas, locks ou escritas novas de leitura.
  Transação e rollback da auditoria preservados na exclusão.
- Sem mudança de rotas, payloads, permissões, retenção ou schema do banco.
  Services users/RBAC existentes permanecem fora desta revisão.
