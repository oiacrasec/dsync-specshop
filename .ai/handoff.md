# Handoff

- **Atualizado em:** 2026-11-07 21:41
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-2001-mvp.md
- **Último commit anterior a esta etapa:** 452eb95 feat(catalog): filter products by archived status

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 2.3 Tela Shopping e ajuste da grid — ✅ concluídos |
| Próximo passo exato | Propor o escopo da 3.1 (conector do Mercado Livre, ADR 2002), item a item |
| Aguardando o usuário? | sim — aprovação do escopo da 3.1 antes de iniciar |

## Feito nesta etapa

- Meus produtos: substituído Situação por Arquivado (Não/Sim/Todos); padrão não arquivados.
  Apenas list consulta all_objects escopado; detalhes/escritas/options excluem arquivados.
  is_archived somente leitura omite Editar/Arquivar. 21 testes API + 22 Produtos/Shopping,
  lint/formato/build/check/migrations pendentes passaram. OpenAPI e docs atualizados.
- Usuário aprovou aplicar a grid desenhada no FigCraft. Shopping usa o `ui-table` real:
  Data, Produtos (quantidade distinta entre fontes), UF, CEP e Ações (⋯ → Abrir).
- Revisão aplicada: busca geral por nome/modelo de produto usado; De/Até em Filtros avançados,
  sem hora, com `ui-input-date` e calendários. Última revisão passou em 20 testes API e 13 Shopping.
  API usa EXISTS sem duplicar pesquisas e dias completos no fuso do usuário; erro 422 por campo.
- Removido do schema o filtro Ativo herdado. De/Até usam `ui-input-date`; teste com Aura
  comprova os dois botões visíveis e abertura dos calendários ao clicar. FigCraft atualizado.
- Resultado com Nova pesquisa preenchido, Continuar secundário e menu ⋯ por linha elegível;
  contagem/paginação padrão. Nova tentativa revalida a situação atual antes de enviar.
- `/shopping` exige `search:view`; `/shopping/nova` exige `search:create`.
  Formulário preservado em `shopping/new-search/`; Nova pesquisa condicionado à permissão.
- Abrir navega ao resultado existente sem coletar. Pesquisar cria e abre com `autorun`.
  Voltar/Cancelar retornam à lista; Nova pesquisa no resultado abre o formulário.
- `ShoppingService.list` usa `BaseCrudService.listTable`, paginação/ordenação no servidor
  (`-created_at` por padrão), schema em cache e transformação só dos itens da página.
  Criar invalida o cache da lista. CEP formatado, UF vazia = Todas, CEP vazio = travessão.
- Core: b1310d8 (ações condicionais), 637feee (datas gerais), merge 281f25c; sem push.
  FigCraft atualizado via CLI após fechamento do editor. OpenAPI regenerado e docs sincronizadas.
- Validação: 20 testes da API, 15 de componentes/adaptador e 13 do Shopping no Chrome Headless;
  lint/formato backend/frontend, build, check, check --deploy e migrations pendentes OK.
  Query count constante com 1/20 pesquisas, página 10; não é benchmark de produção.
- Concluídas no plano: 0.1, 0.2, 1.1–1.3 e 2.1–2.3. Histórico detalhado no plano/log.

## Contexto do projeto

- SPECSHOP é derivado do core (ADR 0036): não editar arquivos do core ou criar migrations
  nos apps dele. Mudanças necessárias no core são feitas em `../datasync-core` e mescladas.
- Apps/rotas do projeto: `backend/config/project.py`, `backend/config/api/project.py`;
  permissões: `apps/<app>/permission_catalog.py`; isolamento: `apps/<app>/tests/isolation.py`.
- Menu/rotas frontend: `src/app/project/project.menu.ts` e `project.routes.ts`.
- Produto: `docs/domain/specshop/`. ADRs do projeto a partir de 2000; planos de 2001.
- Design: `design/specshop-telas.figcraft`; biblioteca do core preservada.
- MCP FigCraft configurado em `~/.codex/config.toml`, attach porta 7710. CLI instalada em
  `C:\Program Files\ArtCraft\FigCraft\figcraft-cli.exe`; editor precisa abrir com `--control`
  e raízes de automação de `design/` (procedimento em `design/README.md`).

## Avisos

- Não imprimir/versionar segredos do `backend/.env` (incluindo credenciais do Mercado Livre).
  Push só quando pedido; core e SPECSHOP têm commits locais sem push.
- SDK local `.venv` (Python 3.14) existe sem dependências. Testes usaram o executável do SDK
  com PYTHONPATH apontando a `../datasync-core/.venv/Lib/site-packages`; banco `dsync_spechop`.
- Falhas conhecidas do core neste Windows: testes de leitura de fontes em cp1252 e schema
  OpenAPI/fusos (`test_views_and_serializers_extend_the_project_bases`,
  `test_nobody_uses_django_file_storage_directly`, `test_versioned_schema_file_matches_the_code`).
- Fonte continua indisponível até a 3.1. 0.3/0.4 pendentes antes dos blocos 5/6 (plano).
- Lista da API ainda inclui `items`; página padrão de 10 pesquisas, até 10 produtos por
  pesquisa hoje. Transformação linear, sem consultas por linha; resumo da API fica para depois.
- Eventos `product.*` sem rótulo na auditoria do core; candidato ao core: erros 422 por campo
  do formulário de produtos. Tema roxo, ícones e prazo do dashboard pendentes (`telas.md`).
- Frontend zoneless: estado assíncrono em `signal`. CEP do formulário sem máscara, como antes.
