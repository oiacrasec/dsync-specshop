# Histórico do conhecimento

## 2026-10-03 — Limite de linha alterado para 120

- Por pedido do usuário, Ruff e padrão do backend passaram de 100 para 120
  caracteres, mantendo E501 ativo e formatação manual nos models.
- Models e exemplo sincronizados com o formato compacto dentro do novo limite;
  AGENTS, standard Django, overview, conhecimento e handoff atualizados.
- Ruff ajustou quatro arquivos ao novo limite; validador completo passou com
  58 testes, lint, formatação, migrations e checks de desenvolvimento/produção.

## 2026-10-03 — Padrão de models documentado no backend

- Revisados os models de core/users; agrupados os itens restantes de
  `update_fields` em BaseModel, sem alteração de comportamento.
- Após o usuário apontar linhas longas, confirmou o limite de **100 caracteres**.
  FKs foram quebradas mantendo argumentos agrupados e alinhamento vertical;
  removida a exceção E501 dos models, preservando a exclusão do formatter.
- Criados `backend/docs/standards/django-style.md` e `backend/docs/examples/model.md`
  nos locais previstos pelo baseline. AGENTS/README passaram a referenciar essas
  fontes; memória e handoff sincronizados.

## 2026-10-03 — Preferência de formatação dos models

- Usuário definiu campos compactos, argumentos agrupados e continuação alinhada,
  sem um argumento por linha. Preferência registrada em `backend/AGENTS.md`.
- Preservado o exemplo editado pelo usuário em `BaseModel`; os demais campos
  de autoria foram ajustados ao mesmo formato, sem mudança de comportamento.
- `backend/pyproject.toml` preserva formatação manual em `models.py`, excluindo
  esses arquivos do formatter e permitindo linhas longas; demais regras de lint
  mantidas. Handoff atualizado.

## 2026-10-03 — Etapa 1.1 antecipada ao JWT

- Usuário aprovou executar 1.1 antes de 0.3, para usar `public_id` nos tokens
  sem expor a PK interna. Ordem registrada no plano da Entrega 1.
- `apps/core/models.py`: BaseModel, tabelas `dsc_` automáticas, UUID v7, datas,
  autoria explícita, consultas sem excluídos e soft delete individual/em lote.
- `apps/users/{models,managers}.py`: User adaptado, preservando `is_active`,
  create_user/create_superuser e bloqueando autenticação dos excluídos.
- Migration inicial regenerada após confirmar banco vazio; não aplicada ao
  banco de desenvolvimento. Testes cobrem dados preservados, autoria, unicidade,
  autenticação e exclusão em lote com número constante de queries.
- Sincronizados AGENTS/README do backend, overview, plano, memória e handoff.
  Expurgo, eliminação e escopos continuam em suas etapas futuras.

## 2026-10-03 — Nome do módulo de filtros de log

- Por preferência do usuário, `apps/core/request_id.py` foi renomeado para
  `apps/core/log_filters.py`. O contexto de correlação permanece junto ao filtro.
- Atualizados imports em middleware/exceções/testes e caminho do filtro nos settings.
- Documentação, memória e handoff atualizados. Comportamento preservado.

## 2026-10-03 — Logs de requisição apenas para erros

- Por decisão do usuário, `RequestIdMiddleware` registra apenas respostas 4xx
  (WARNING) e 5xx (ERROR). Sucessos e redirecionamentos não geram log de conclusão.
- Mantido `X-Request-Id` em todas as respostas e correlação dos erros com logs.
- Atualizados middleware, testes, contrato em `docs/api/`, memória e handoff.
- Observabilidade mais ampla será tratada futuramente; AccessLog da etapa 4.1
  continua previsto no plano.
- Validador completo passou com 47 testes, lint, formatação, migrations e checks
  de desenvolvimento/produção. Permanece o aviso não impeditivo de cache do pytest.

## 2026-10-03 — Etapa 0.2: API versionada, erros e correlação

- Criado `backend/config/api/v1.py`, incluído sob `/api/v1/` em `config/urls.py`;
  fallback de URLs da API retorna 404 em RFC 9457, inclusive com DEBUG ligado.
- Criados `apps/core/{exceptions,middleware,request_id}.py`: handler global,
  exceções de domínio, request ID gerado no servidor e filtro de logs.
- Settings base/production integram handler, middleware e correlação de logs;
  middleware de correlação fica antes de SecurityMiddleware e WhiteNoise.
- Criados testes de erros, rollback, isolamento concorrente, headers e montagem
  de rotas; atualizados AGENTS/README do backend e overview arquitetural.
- Documentado contrato em `docs/api/{overview,errors}.md` e os 11 tipos em
  `docs/api/errors/`; memória, plano e handoff sincronizados.
- Validador completo passou: 46 testes, lint, formatação, migrations sem alterações,
  system checks e checks de produção. Aviso não impeditivo de cache do pytest.
- Nenhuma nova dependência, query de aplicação ou regra de negócio de etapas futuras.

## 2026-10-03 — Etapa 0.1: remoção do Django Admin e sessões

- Removidos Django Admin, sessions, messages e integrações associadas.
- Mantida permissão global `IsAuthenticated`, sem autenticadores até a etapa 0.3.
- Testadas rotas ausentes (404) e criação de superusuário sem o Admin.
- Atualizados `backend/config/settings/{base,production}.py`, `backend/config/urls.py`,
  `backend/apps/users/admin.py` (removido), testes de core/users, `backend/AGENTS.md`,
  `backend/README.md`, `docs/architecture/overview.md`, plano da Entrega 1 e handoff.
- Conhecimento compilado em `.ai/knowledge/architecture/backend.md`.
- Validador completo passou: 5 testes, lint, formatação, migrations sem alterações,
  system checks e checks de produção. Aviso não impeditivo de cache do pytest.
