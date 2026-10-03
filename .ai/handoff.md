# Handoff

- **Atualizado em:** 2026-10-03 17:55
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Commit desta etapa:** `refactor(backend): remove Django admin and session stack` (inclui este handoff; consultar `git log -1` para o hash)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 0.1 Remover Django Admin, `sessions` e `messages` — ✅ concluída |
| Próximo passo exato | aguardar aprovação e executar a etapa 0.2: `/api/v1/`, handler global RFC 9457 e `request_id` |
| Aguardando o usuário? | sim — aprovação para iniciar a etapa 0.2 |

## Feito até aqui
- ADRs 0001–0012 escritos e revisados (0003 continua Proposto, para a discussão do frontend).
- Skills de processo, conformidade legal, segurança, performance, erros da API, validação de etapa e handoff.
- Backend Django 5.2 LTS montado (`backend/`), sem Django Admin, sessões ou messages;
  `TimeStampedModel` ainda será substituído na etapa 1.1.
- Configuração do PyCharm documentada em `backend/README.md`.
- Skills `modo-de-trabalho` e `handoff` criadas; `AGENTS.md` exige lê-las no início de toda sessão.

## Feito nesta etapa
- Removidos apps, middlewares, context processors, configurações de cookies de sessão,
  `SessionAuthentication`, rota do Admin e `apps/users/admin.py`.
- `IsAuthenticated` global mantido, com autenticadores vazios até o JWT da etapa 0.3.
- Testes de rotas ausentes (404, sem cookie de sessão) e criação de superusuário.
- Validador completo passou: 5 testes, lint, formatação, migrations sem alterações,
  system checks e checks de produção. Cache do pytest emitiu aviso não impeditivo.
- Revisão OWASP: A01, A02, A04, A06, A07 e A10 sem achados novos no diff;
  A03, A05, A08 e A09 sem alterações aplicáveis. Performance sem achados;
  nenhuma nova query de aplicação. Checklist legal base sem novos tratamentos de
  dados, dependências ou conteúdo de terceiros; sem nova interface de usuário.
- Atualizados documentação, plano e `.ai/knowledge/` no mesmo commit.

## Falta nesta etapa
- Nada.

## Dúvidas abertas
- Nenhuma.

## Avisos
- **Não rodar `migrate`** antes da etapa 1.1: a migration do `User` será refeita (`dsc_user` + `BaseModel`).
- `backend/.env` existe só localmente (credenciais `postgres:postgres`, banco `datasync-core`); nunca versionar.
- Push para o GitHub só quando o usuário pedir (a `main` local está à frente do `origin/main`).
- No Windows, o validador passou com Git Bash e PATH definido dentro do Bash:
  `"C:/Program Files/Git/bin/bash.exe" -c 'export PATH=/usr/bin:/bin:$PATH; bash .ai/skills/validar-etapa/validar.sh'`.
