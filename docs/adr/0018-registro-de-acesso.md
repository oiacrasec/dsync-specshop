# 0018 — Registro de acesso fora dos tipos de escopo

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADR 0006 §6, ADR 0007 §4, ADR 0012

## Contexto

O Marco Civil (art. 15) obriga a guardar por 6 meses, sob sigilo, o registro de acesso à
aplicação: data e hora (UTC), IP e porta de origem. O ADR 0006 §6 acrescenta usuário,
contrato e organização. Requisições anônimas e do superadmin não têm contrato nem
organização, então o registro não cabe em nenhum dos quatro tipos de escopo, e o
ADR 0012 exige um ADR novo para cada exceção. O usuário aprovou as decisões na etapa 4.1.

## Decisão

`AccessLog` em `apps/audit`, fora do `BaseModel` e dos tipos de escopo
(`UNSCOPED_RECORDS` no system check).

| Regra | Decisão |
|---|---|
| O que grava | toda requisição a `/api/`, inclusive anônima e com erro: data e hora (UTC), IP, porta, usuário, contrato, organização e `request_id`. Nada além (LGPD necessidade; Marco Civil art. 16 II) |
| Contrato e organização | os do contexto de tenant validado; sem contexto (ex.: login), o contrato do usuário identificado |
| IP e porta reais | headers do proxy reverso configurados por `DJANGO_ACCESS_LOG_IP_HEADER`/`DJANGO_ACCESS_LOG_PORT_HEADER` (ex.: `X-Real-IP`/`X-Real-Port` com `$remote_addr`/`$remote_port` no nginx). Header ausente ou inválido → conexão direta. `check --deploy` avisa se não configurado |
| Gravação | middleware após a resposta, fora da transação da view (sobrevive a erros) |
| Model | sem soft delete, autoria nem `public_id` (volume alto); só inserção: alterar ou excluir levanta erro |
| Leitura | só global explícita (`system_context()` ou `unscoped()`), para atender ordem judicial (art. 15 §3º e art. 22) |
| Retenção | mínima de 6 meses declarada no model. Expurgo automático e `LegalHold` vêm na entrega do ADR 0007, **obrigatórios antes de produção** |

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Forçar um tipo de escopo | contrato/organização opcionais não cabem; `Hybrid` exporia registros "do sistema" a clientes |
| Herdar `BaseModel` | soft delete e autoria não fazem sentido num registro imutável de alto volume |
| Gravar também método, rota e status | dado além do exigido pela lei |
| Fila assíncrona já agora | complexidade sem volume que justifique |
| Headers fixos de um proxy específico | o proxy de produção ainda não foi definido |

## Consequências

- Toda requisição à API faz um INSERT a mais.
- Testes de API precisam de banco; os que passam por views fora de transação usam banco transacional.
- Antes de produção: expurgo + `LegalHold` (ADR 0007), headers do proxy configurados,
  criptografia do banco e dos backups e relógio sincronizado (NTP).
- O IP é dado pessoal (LGPD): acesso restrito e auditado; entrega só com ordem judicial,
  exportando apenas o recorte pedido (usuário ou IP + período).
