# Handoff

- **Atualizado em:** 2026-10-03 17:12
- **Agente:** Claude (passando o bastão para o Codex)
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Último commit:** 0ed1d22 docs(ai): add agent handoff and working-mode skills

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 0.1 Remover Django Admin, `sessions` e `messages` — ⬜ não iniciada |
| Próximo passo exato | aguardar a aprovação do usuário e executar a etapa 0.1 conforme o plano |
| Aguardando o usuário? | sim — aprovação para iniciar a etapa 0.1 |

## Feito até aqui
- ADRs 0001–0012 escritos e revisados (0003 continua Proposto, para a discussão do frontend).
- Skills de processo, conformidade legal, segurança, performance, erros da API, validação de etapa e handoff.
- Backend Django 5.2 LTS montado (`backend/`), ainda **anterior** aos ADRs (tem Django Admin e `TimeStampedModel`).
- Configuração do PyCharm documentada em `backend/README.md`.
- Skills `modo-de-trabalho` e `handoff` criadas; `AGENTS.md` exige lê-las no início de toda sessão.

## Falta nesta etapa
- Toda a etapa 0.1.

## Dúvidas abertas
- Nenhuma.

## Avisos
- **Não rodar `migrate`** antes da etapa 1.1: a migration do `User` será refeita (`dsc_user` + `BaseModel`).
- `backend/.env` existe só localmente (credenciais `postgres:postgres`, banco `datasync-core`); nunca versionar.
- Push para o GitHub só quando o usuário pedir (a `main` local está à frente do `origin/main`).
- Codex: o hook do rtk ainda não está configurado (`rtk init -g --codex`, a critério do usuário); o MCP do codegraph já está.
