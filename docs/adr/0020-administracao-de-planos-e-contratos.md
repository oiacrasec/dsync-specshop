# 0020 — Administração de planos e contratos

- **Status:** Aceito
- **Data:** 2026-10-04
- **Complementa:** ADRs 0008, 0011 e 0015

## Contexto

A etapa 5.2 publica a gestão administrativa de planos e contratos. O cadastro de
usuários já serializa o consumo de vagas pela linha do contrato. Uma redução de
licenças sem essa proteção poderia deixar o contrato acima da capacidade.

## Decisão

- Usuário aprovou impedir redução de licenças abaixo da quantidade de usuários
  não excluídos, contando inativos. Validação retorna 422 no campo `licenses`.
- Atualização usa a versão atual bloqueada do contrato, dentro da transação;
  redução e cadastro/transferência/restauração de usuários compartilham esse lock.
  Não há lock global nem contagem de usuários nas leituras administrativas.
- Área `/api/v1/admin/` continua exclusiva de superadmin ativo, sem contexto
  organizacional (ADR 0008). `options` usa essa mesma autorização de leitura
  administrativa; a exigência de `:view` com organização continua nos recursos comuns.
- Criar/alterar/excluir planos e contratos produz AuditEvent append-only, na
  transação da alteração. Registra configuração, UUID, ator e data; nomes de
  clientes não são copiados para o JSON de auditoria. Leituras não geram escritas.

## Consequências

- Redução concorrente com cadastro não permite exceder o limite: uma operação
  pode ser recusada conforme a ordem de aquisição do lock.
- Soft delete segue o model existente, sem cascata, expurgo ou cancelamento
  comercial. Plano excluído não pode ser selecionado em nova escrita, mas a FK
  histórica continua consultável e o contrato permanece editável.
- Quotas de plano continuam somente configuração, sem contadores ou enforcement.
- A API não implementa cobrança, aceite, assinatura, contratação ou encerramento
  jurídico; esses fluxos exigem entrega própria.
