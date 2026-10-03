# 0010 — Gestão de usuários e superadmins pela área administrativa

- **Status:** Aceito
- **Data:** 2026-10-03
- **Substitui:** ADR 0008, trecho "superadmin só é criado ou promovido por comando no servidor"

## Contexto

O ADR 0008 definiu que superadmins só seriam criados por management command, para que
o roubo de uma sessão de superadmin não permitisse criar outros superadmins. Na
operação, a equipe precisa criar novos superadmins e gerenciar os usuários de todos os
contratos pela própria área administrativa.

## Decisão

| Ação | Como |
|---|---|
| Criar o **primeiro** superadmin | management command (`createsuperuser`) |
| Criar **outros** superadmins | pela **área administrativa**, por um superadmin |
| Criar e gerenciar **qualquer** usuário (de qualquer contrato) | pela área administrativa, pelo superadmin |
| Criar os **admins dos contratos** | pela área administrativa, pelo superadmin (atribuindo o perfil essencial "Administrador do contrato", ADR 0009) |

- A gestão de usuários **dentro** de um contrato continua sendo também do admin do
  contrato (ADR 0009 §3.1), limitada ao próprio contrato.
- Não há proteção extra na criação de superadmins nesta fase.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Superadmin só por comando (ADR 0008) | exige acesso ao servidor para uma tarefa operacional frequente |
| Pela área administrativa com proteções (confirmação de senha, aviso aos demais superadmins) | adiado; o MFA virá antes |

## Consequências

- ⚠️ **Risco aceito:** uma sessão de superadmin comprometida permite criar outros
  superadmins e se manter no sistema. Mitigação planejada: **MFA para superadmin**
  (skill `owasp-top-10`, A07) numa entrega futura.
- Toda criação de superadmin e toda alteração de `is_superuser` deve ser registrada
  (quem, quando, para quem).
