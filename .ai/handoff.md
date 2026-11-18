# Handoff

- **Atualizado em:** 2026-11-18 14:00
- **Agente:** Claude
- **Plano ativo:** docs/plans/entrega-2001-mvp.md
- **Último commit:** d51b1c8 feat(pricing): add Mercado Livre catalog connector (3.1, sem push)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.2 Correspondência e elegibilidade — 🔄 commitada; falta o alerta de outlier na tela (FigCraft) |
| Próximo passo exato | Propor o escopo da 3.2b (estados no core), item a item; usuário aprovou iniciar |
| Aguardando o usuário? | sim — aprovação do escopo da 3.2b; revisão do d51b1c8 quando puder |

## Feito na 3.2

- `apps/pricing/matching.py`: modelo palavra inteira e pelo núcleo ("SM-S921B" → "S921B"),
  marca, capacidade, várias unidades. Sem listas de sufixos por categoria (usuário vetou).
- Conector ML: cascata EAN → marca + modelo → nome + modelo; família `parent_id`.
- Elegibilidade: `condition_unconfirmed`, `multi_unit` e `outlier` (≥ 10× a mediana; migration
  `pricing.0003` com `outlier_count`; OpenAPI regenerado sem o fuso `localtime` da máquina).
- 73 testes de pricing; suíte 885 ✅ + 1 falha conhecida de ambiente (abaixo).
- Docs: ADR 2001/2002, `docs/api/searches.md`, plano (16–25, F-1, etapa 3.2b), D-24 para o idealizador.

## Pendências

1. Alerta de outlier na tela: desenhar no FigCraft e validar com o usuário (backend pronto:
   `outlier` ≥ 10× a mediana, `outlier_count` na linha).
2. Merge do core `d2b26e6` (regra de revisar commits) no SPECSHOP, junto com o merge da
   3.2b; mostrar o commit de merge antes.
3. S24: as ofertas estão em produtos "Galaxy S24" (MODEL "S24"); ligar a "SM-S921B" exige
   a confirmação de correspondência da F-1. Trocar o modelo para "S24" NÃO é seguro (casaria
   com S24 FE/Plus/Ultra).

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
