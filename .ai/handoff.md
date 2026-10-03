# Handoff

- **Atualizado em:** 2026-10-03 18:16
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-1-fundacao-tenancy-rbac.md
- **Última alteração:** `fix(api): log request completion only for errors` (inclui este handoff; consultar `git log -1` para o hash)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 0.2 `/api/v1/`, handler global RFC 9457 e `request_id` — ✅ concluída |
| Próximo passo exato | aguardar aprovação e executar a etapa 0.3: JWT login/refresh/logout, rotação e blacklist conforme ADR 0004 |
| Aguardando o usuário? | sim — aprovação para iniciar a etapa 0.3 |

## Feito até aqui
- ADRs 0001–0012 escritos e revisados (0003 continua Proposto, para a discussão do frontend).
- Skills de processo, conformidade legal, segurança, performance, erros da API, validação de etapa e handoff.
- Backend Django 5.2 LTS montado (`backend/`), sem Django Admin, sessões ou messages;
  `TimeStampedModel` ainda será substituído na etapa 1.1.
- Configuração do PyCharm documentada em `backend/README.md`.
- Skills `modo-de-trabalho` e `handoff` criadas; `AGENTS.md` exige lê-las no início de toda sessão.
- Etapas 0.1 e 0.2 concluídas. Contrato de erros em `docs/api/errors.md` e catálogo
  completo em `docs/api/errors/`; `config/api/v1.py` ainda sem endpoints de negócio.

## Feito nesta etapa
- API v1 incluída no prefixo `/api/v1/`, fallback 404 JSON para rotas desconhecidas
  da API, inclusive com DEBUG ligado (evita página de boas-vindas do Django).
- Handler central de exceções DRF/Django/domínio: RFC 9457, validação 422, sintaxe
  400, conflitos 409; 500 genérico e logs técnicos sem conteúdo de requisição.
- UUID v7 gerado por requisição, `X-Request-Id`, contextvar isolado e filtro de logs.
- Preservados headers de protocolo e rollback em transações de requisição.
- Validador completo passou: 46 testes, lint, formatação, migrations sem alterações,
  system checks e checks de produção. Cache do pytest emitiu aviso não impeditivo.
- Revisão OWASP A01/A02/A04/A05/A06/A07/A08/A09/A10 sem achados novos no diff;
  A03 sem alterações de dependências. Performance sem achados: nenhuma nova query
  de aplicação; logs registram status e ID, sem payload, IP ou identidade do usuário.
- Checklist legal base revisado para o diff: nenhuma nova dependência ou interface;
  sem coleta de novos campos pessoais. O AccessLog obrigatório permanece na etapa 4.1.
- Atualizados documentação, catálogo dos 11 tipos, plano e `.ai/knowledge/`.
- Ajuste posterior solicitado pelo usuário: log de conclusão apenas para erros
  (4xx WARNING / 5xx ERROR). Respostas 2xx/3xx mantêm o ID, sem log de conclusão.
  Observabilidade mais ampla fica para evolução futura.
- Validação do ajuste: 47 testes e todas as verificações automáticas passaram;
  revisão do diff sem novos achados de segurança ou performance. Permanece o
  aviso não impeditivo do cache do pytest.

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
