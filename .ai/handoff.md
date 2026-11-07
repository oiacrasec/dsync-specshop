# Handoff

- **Atualizado em:** 2026-11-07 20:56
- **Agente:** Codex
- **Plano ativo:** docs/plans/entrega-2001-mvp.md
- **Último commit anterior a esta revisão:** 2cd8f62 docs(design): add the Shopping search list proposal

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 2.3 Tela Shopping — ✅ concluída (testada no navegador; fonte responde "indisponível" até a 3.1) |
| Próximo passo exato | Revisar com o usuário a nova tela 2 (Shopping: pesquisas) já desenhada no FigCraft; ajustar o design antes de implementar a grid |
| Aguardando o usuário? | sim — revisão visual do desenho; implementação da grid e etapa 3.1 ainda pendentes |

## Dúvidas abertas

- **Grid do Shopping (desenho pronto para revisão, frontend não iniciado):**
  - Usuário pediu ajustar primeiro no FigCraft. Tela 2 desenhada em `design/specshop-telas.figcraft`:
    Data, Produtos (quantidade), UF do vendedor, CEP de entrega e Ações (⋯ → Abrir); botão Nova pesquisa.
    Conferido com `ui-table` real: linhas de 40 px, coluna Ações de 63 px e contagem para página única.
    Formulário preservado como 2c. Protótipo liga lista → formulário/resultado e Voltar/Cancelar → lista.
    Renderização e interações inspecionadas; dados identificados como exemplos.
  - `shopping` = `ui-table` lazy sobre `GET /api/v1/searches/` (já existe, paginado, ordena por `created_at`)
    com botão "+ Nova pesquisa" e ação "Abrir"; `shopping/nova` = formulário atual;
    `shopping/:id` = resultado atual (o Pesquisar continua indo ao resultado com `autorun`).
  - Colunas sugeridas para o MVP: Data, Produtos (quantidade), UF e CEP. Coluna "Situação"
    (ex.: "3 de 5 concluídas") ficou fora: exige mudar a API.
  - `docs/domain/specshop/telas.md` atualizado com a proposta em revisão (tela 2 = grid, 2c = formulário).
  - Performance: a lista devolve as linhas de cada pesquisa (prefetch, consultas constantes;
    até 100 linhas por página de 10). Aceitável no MVP; uma versão resumida da lista fica
    para depois, se for preciso.

## Feito nesta sessão

- 0.2 Mercado Livre (ADR 2002): API de catálogo como fonte principal, extensão do navegador
  como complemento; DE-PARA por loja em `docs/domain/specshop/fontes-de-para.md`.
- Telas do MVP no FigCraft (`design/specshop-telas.figcraft`, inventário em `telas.md`).
- 1.1 (ADR 2003): escopo dos dados, base global de observações, confiança na coleta,
  pesquisa por produto sem fila, permissões e perfis.
- Core (`../datasync-core`, publicado no GitHub até 5e73bde): ADR 0044 (permissões por app em
  `permission_catalog.py`), arquivos do projeto `config/project.py` e
  `config/api/project.py`, fábricas de isolamento em `apps/<app>/tests/isolation.py`.
  Trazidos para cá com `git fetch ../datasync-core main && git merge FETCH_HEAD`.
- 1.2: `apps/catalog` (TrackedProduct, API, permissões, testes, `docs/api/products.md`).
- 2.3: tela Shopping (`pages/pesquisa-precos/shopping`): criar pesquisa e resultado que executa
  as linhas pendentes (até 3 em paralelo) com nova tentativa; core ganhou a coluna `choice-tag`
  no `ui-table` (1c0c31d). Estado assíncrono das telas em `signal` (app zoneless).
- 2.2: API `/api/v1/searches/` com run/retry por linha e contrato de conector (`docs/api/searches.md`).
- 2.1: `apps/pricing` (models, base global particionada, gravação e série; medição no ADR 2003);
  core ganhou `PROJECT_UNSCOPED_RECORDS` e `GlobalOnlyManager` (186f940).
- 1.3: tela "Meus produtos" no frontend; core ganhou `frontend/src/app/project/project.menu.ts` e
  `project.routes.ts` (cce830c, ef62937 no core local, sem push).

## Contexto do projeto

- Este repositório é o **SPECSHOP**, projeto derivado do core (ADR 0036): só acrescentar;
  nunca editar arquivos do core nem criar migrations em apps do core. Precisando mudar o
  core, a mudança é feita em `../datasync-core` e trazida por merge.
- Apps do projeto em `backend/config/project.py`; rotas em `backend/config/api/project.py`;
  permissões em `apps/<app>/permission_catalog.py`; fábricas de isolamento em
  `apps/<app>/tests/isolation.py`. `docs/api/openapi-v1.yaml` é regenerado, nunca mesclado à mão.
- Produto: `docs/domain/specshop/`. ADRs do SPECSHOP a partir de **2000**, planos a partir
  de **2001** (ADR 2000), índice em `docs/adr/projeto.md`.
- Preferências do usuário: decidir item a item, um por vez, sempre com apresentação visual.

## Avisos

- Não imprimir/versionar segredos (`ML_CLIENT_ID`/`ML_CLIENT_SECRET` no `backend/.env`).
  Push só quando pedido (core e SPECSHOP têm commits locais sem push).
- Python: sem `.venv` no SPECSHOP; testes rodados com `../datasync-core/.venv` (Python 3.14),
  banco `dsync_spechop` do `backend/.env`.
- Três testes do core falham só neste Windows (cp1252 ao ler fontes e lista de fusos no
  OpenAPI): `test_views_and_serializers_extend_the_project_bases`,
  `test_nobody_uses_django_file_storage_directly` e, no core, `test_versioned_schema_file_matches_the_code`.
- Eventos de auditoria do SPECSHOP (`product.*`) não estão nas choices do core: gravam, mas a
  interface de auditoria mostra o código sem rótulo (extensão futura no core).
- Candidato a mover para o core: aplicar erros 422 aos campos do formulário (hoje em
  `produtos/formulario/formulario.ts`).
- Hoje não há lista de pesquisas no frontend: a pesquisa fica gravada e reabre pela URL do resultado (ver a proposta da grid).
- Frontend é zoneless: estado que muda após HTTP fica em `signal`, senão a tela não redesenha.
- O campo CEP do Shopping não tem máscara (aceita só dígitos ou com hífen); não pedido.
- O roxo do tema, ícones de arquivar/atualizar e prazos do dashboard seguem pendentes (`telas.md`).
