# 0023 — Services nos serializers de escrita

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADRs 0002 e 0021

## Contexto

Usuário determinou chamar services pelos métodos create/update dos serializers,
seguindo o ciclo serializer.save() do DRF. A delegação atual estava nos hooks da view.
No Spatial, os hooks chamam serializer.save(); seu BaseModelSerializer usa a gravação
padrão do ModelSerializer, sem delegação genérica para services.

## Decisão

- Core disponibiliza ServiceModelSerializer, herdando ScopedModelSerializer.
  create/update chamam save_service declarado explicitamente como staticmethod.
- View mantém os hooks padrão do DRF: serializer.save() encaminha ao método
  correto e associa a instância retornada. Não chamar o service pela view.
- Serializer repassa dados validados, instância na atualização e ator de
  context['request'].user explicitamente ao service. Request não chega ao model.
- Service continua responsável por autorização interna, regras, transação, locks,
  autoria e auditoria. Serializer não implementa essas regras nem usa ORM direto.
- Exclusão continua em ServiceDeleteMixin, pois serializer não tem delete no DRF.

## Consequências

- Fluxo de escrita: View → Serializer.save/create/update → Service → Model.
- Plan/ContractSerializer declaram save_service; suas views declaram selector e
  delete_service. Composição da base e cabeçalho manual preservados.
- Uso do serializer sem view também passa pelo service, exigindo contexto do ator.
  Sem mudança de API, permissões, queries, migrations ou contrato de erros.
