# Handoff

- **Atualizado em:** 2026-11-18 14:45
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-2001-mvp.md
- **Último commit:** 2cea410 feat(pricing): match catalog products and flag ineligible offers (sem push)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.2b Estados no core — 🔄 trabalho no `../datasync-core` (ver o handoff de lá) |
| Próximo passo exato | Seguir o handoff do core: validar o commit WIP b780e5d, desenhar as telas Localizações no FigCraft iguais ao app, validar com o usuário, frontend, merge no SPECSHOP |
| Aguardando o usuário? | sim — validação do desenho; revisão do d51b1c8 quando puder |

## Estado das etapas

- 3.1 ✅ `d51b1c8` · 3.2 🔄 `2cea410` (falta só o alerta de outlier na tela, após FigCraft).
- 3.2b: core `07a12fb` (State/City IBGE, `unaccent`, `/states/`, `/cities/`) e `b780e5d` (admin,
  WIP sem validação completa). Pontos 1–5 aprovados (plano, decisão 25). Depois do merge, o
  SPECSHOP troca `BRAZIL_STATES`, `BRAZIL_STATE_BY_NAME` e `BRAZIL_STATE_OPTIONS` pela tabela
  do core (cache no processo) e a tela de Nova pesquisa lê `/api/v1/states/`.

## Pendências

1. Alerta de outlier na tela: desenhar no FigCraft e validar (backend pronto: `outlier`
   ≥ 10× a mediana, `outlier_count`).
2. Merge do core (`d2b26e6` regra de revisar commits, `07a12fb`, `b780e5d` e telas) no SPECSHOP,
   mostrando o commit de merge antes.
3. S24: ofertas estão em produtos "Galaxy S24" (MODEL "S24"); ligar a "SM-S921B" exige a
   confirmação de correspondência da F-1. Trocar o modelo para "S24" NÃO é seguro.

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
