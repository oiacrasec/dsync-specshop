# Handoff

- **Atualizado em:** 2026-11-07 21:06
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-2001-mvp.md
- **Último commit anterior a esta etapa:** 32882fe docs(design): align the Shopping grid with ui-table

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 2.3 Tela Shopping e ajuste da grid — ✅ concluídos |
| Próximo passo exato | Propor o escopo da 3.1 (conector do Mercado Livre, ADR 2002), item a item |
| Aguardando o usuário? | sim — aprovação do escopo da 3.1 antes de iniciar |

## Feito nesta etapa

- Usuário aprovou aplicar a grid desenhada no FigCraft. Shopping usa o `ui-table` real:
  Data, Produtos (quantidade distinta entre fontes), UF, CEP e Ações (⋯ → Abrir).
- `/shopping` exige `search:view`; `/shopping/nova` exige `search:create`.
  Formulário preservado em `shopping/new-search/`; Nova pesquisa condicionado à permissão.
- Abrir navega ao resultado existente sem coletar. Pesquisar cria e abre com `autorun`.
  Voltar/Cancelar retornam à lista; Nova pesquisa no resultado abre o formulário.
- `ShoppingService.list` usa `BaseCrudService.listTable`, paginação/ordenação no servidor
  (`-created_at` por padrão), schema em cache e transformação só dos itens da página.
  Criar invalida o cache da lista. CEP formatado, UF vazia = Todas, CEP vazio = travessão.
- FigCraft e `telas.md` sincronizados. Código do core e backend sem alterações.
- Validação: 10 testes do Shopping em Chrome Headless, lint, format:check e build passaram.
  Navegador precisou executar fora do sandbox. Sem novas dependências.
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
- Sem `.venv` local; sessão anterior usou `../datasync-core/.venv` (Python 3.14), banco
  `dsync_spechop`. Consultar SDK do PyCharm antes de qualquer comando Python.
- Falhas conhecidas do core neste Windows: testes de leitura de fontes em cp1252 e schema
  OpenAPI/fusos (`test_views_and_serializers_extend_the_project_bases`,
  `test_nobody_uses_django_file_storage_directly`, `test_versioned_schema_file_matches_the_code`).
- Fonte continua indisponível até a 3.1. 0.3/0.4 pendentes antes dos blocos 5/6 (plano).
- Lista da API ainda inclui `items`; página padrão de 10 pesquisas, até 10 produtos por
  pesquisa hoje. Transformação linear, sem consultas por linha; resumo da API fica para depois.
- Eventos `product.*` sem rótulo na auditoria do core; candidato ao core: erros 422 por campo
  do formulário de produtos. Tema roxo, ícones e prazo do dashboard pendentes (`telas.md`).
- Frontend zoneless: estado assíncrono em `signal`. CEP do formulário sem máscara, como antes.
