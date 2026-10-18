# 0025 — Classe de service declarada nos serializers

- **Status:** Substituído por 0030
- **Data:** 2026-10-04
- **Complementa:** ADRs 0023 e 0024

## Contexto

Após a criação das classes de services, o usuário aprovou declarar a classe no
serializer e deixar a delegação de create/update pronta na base.

## Decisão

- ServiceModelSerializer declara service_class e implementa create/update chamando
  service_class.save_instance com dados validados, ator e instância na atualização.
- PlanSerializer/ContractSerializer declaram PlanService/ContractService diretamente,
  substituindo save_service e staticmethod. Não repetem create/update.
- O service padrão é BaseModelService, cujo save_instance falha sem implementação.
  Não há fallback à gravação direta do ModelSerializer.
- save_instance continua único para criar/atualizar. Regras de negócio, autorização,
  autoria, transações, locks e auditoria continuam no service.

## Consequências

- Serializer informa a classe; a base concentra a delegação comum.
- Sem mudanças de rotas, payloads, consultas, permissões ou migrations.
- Uso sem view também passa pelo service; ator exige request no contexto.
