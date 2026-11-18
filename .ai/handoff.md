# Handoff

- **Atualizado em:** 2026-11-18 13:30
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-2001-mvp.md
- **Último commit anterior a esta etapa:** 08d2384 docs(ai): record the UI workflow lesson in handoff

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.1 Conector do Mercado Livre — ✅ concluída |
| Próximo passo exato | Propor o escopo da 3.2 (correspondência, kits, duplicatas, valores inválidos), item a item |
| Aguardando o usuário? | sim — aprovação para iniciar a 3.2 |

## Feito nesta etapa

- Usuário delegou as decisões da 3.1 (plano, decisões 10–15). `apps/pricing/mercado_livre.py`:
  token `client_credentials` em cache; EAN por `product_identifier`, senão marca + modelo no
  domínio do `domain_discovery`; filtro mínimo pelo modelo; ofertas de `/products/{id}/items`.
- Medido na API real (revisão do ADR 2002): `/products/search` ~1 chamada/10 s; ofertas e
  domínio sem limite observado; 404 = sem ofertas; UF pelo nome; sem `permalink`.
- Limite tratado sem segurar o worker: vez da busca no cache, espera ≤ 10 s, depois
  `unavailable`; resultado de catálogo em cache 24 h (1 h vazio).
- Real: L3250 → 287 ofertas novas em 14 produtos de catálogo (33 de SC), 9,4 s; com cache 7,7 s.
  S24 `SM-S921B` → 0 (anúncios escrevem "S921b"; ajuste de correspondência na 3.2).
- 18 testes novos com transporte falso; conftest de pricing esvazia o registro de conectores.
  Docs: ADR 2002 (Revisões), `docs/api/searches.md`, plano, log.

## Contexto do projeto

- SPECSHOP é derivado do core (ADR 0036): não editar arquivos do core nem criar migrations
  nos apps dele. Mudanças no core são feitas em `../datasync-core` e mescladas.
- Apps/rotas: `backend/config/project.py`, `backend/config/api/project.py`; menu/rotas do
  frontend em `src/app/project/`. Produto: `docs/domain/specshop/`. ADRs ≥ 2000, planos ≥ 2001.
- Ambiente Linux (desde 17/11): `.venv` na raiz (Python 3.14.8), Node 24.22.3 via nvm,
  PostgreSQL local `postgres:postgres`, banco `dsync_spechop` (nome herdado do Windows).
  PyCharm: run configs `backend: runserver`, `backend: pytest`, `frontend: npm start`.
  Usuários de dev: `admin` (superadmin), `admin_x` (admin do contrato); produto S24 cadastrado.
- `.env` local precisa de `DJANGO_APP_NAME=SPECSHOP` para o OpenAPI bater com o versionado.

## Avisos

- Não imprimir/versionar segredos do `backend/.env` (credenciais do Mercado Livre).
  Push só quando pedido; core e SPECSHOP têm commits locais sem push.
- Falha conhecida de ambiente: `test_versioned_schema_file_matches_the_code` no Linux, porque
  o zoneinfo do sistema acrescenta o fuso `localtime` dentro do pytest (também falha no main).
- 🟠 Produção: a linha da pesquisa segura um worker síncrono por ~8–20 s (2 workers, timeout
  60 s, tela dispara 3 linhas). Antes da produção: mais workers/threads ou fila (rever ADR 2003 §4).
  Cache local por processo: a vez da busca só é coordenada com cache compartilhado.
- Para a 3.2: kits ("Kit 02 Impressoras", "+ Kit Tinta"), outras marcas com o mesmo modelo
  (Rodtec, Genesis), preço absurdo (R$ 1.000.000,00 na L3250) e modelo com prefixo ("SM-").
- Pendentes do ADR 2002: link do anúncio, app do ML na conta da empresa, auditoria jurídica.
- 0.3/0.4 pendentes antes dos blocos 5/6. Tema roxo, ícones e prazo do dashboard (`telas.md`).
