# mfa-state-conflict

- **Type:** `urn:datasync:problem:mfa-state-conflict`
- **HTTP:** 409
- **Título:** Estado da verificação em duas etapas alterado
- **Origem:** ADR 0041 / etapa 9.4

O estado da credencial não permite a operação, por exemplo iniciar configuração
quando o fator já está confirmado. Atualizar a tela e iniciar a operação novamente.
Sem segredo, token, código ou detalhes de credenciais na resposta.
