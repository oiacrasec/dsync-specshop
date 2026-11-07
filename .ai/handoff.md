# Handoff

- **Atualizado em:** 2026-11-07 11:50
- **Agente:** Claude → próximo agente
- **Plano ativo:** docs/plans/entrega-2001-mvp.md
- **Último commit:** fd64f8f docs(specshop): add product domain docs and ADR 2000

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 0.1 Conformidade legal da coleta — ✅ concluída (ADR 2001) |
| Próximo passo exato | Propor o escopo da 0.2: teste do Mercado Livre com a L3250 via API oficial e token da aplicação (`/products/search` e `/sites/MLB/search`) |
| Aguardando o usuário? | sim — aprovação da 0.2 e app criado no portal de desenvolvedores do Mercado Livre (client_id/secret, fora do repositório) |

## Contexto do projeto

- Este repositório é o **SPECSHOP**, projeto derivado do core (ADR 0036): só acrescentar;
  nunca editar arquivos do core nem criar migrations em apps do core.
- Produto: `docs/domain/specshop/` (fonte viva; a especificação original do idealizador,
  v0.8, foi absorvida e não é mantida). IDs D, RF, RQ, Q, DEC e DT preservados.
- ADRs do SPECSHOP a partir de **2000**, planos a partir de **2001** (ADR 2000). Índice
  dos ADRs do projeto em `docs/adr/projeto.md` (ADR 0036 §6).
- Decisões técnicas DT-01 a DT-10 delegadas ao desenvolvimento; cada uma vira ADR 2000+
  (`docs/domain/specshop/decisoes-tecnicas.md`). Não devolver ao idealizador perguntas
  de framework, banco ou arquitetura; mudança de regra de produto volta a ele.
- Usuário escolheu começar pelas fontes (bloco 0) antes da fundação.

## Avisos

- Não imprimir/versionar segredos. Push só quando pedido; nunca --amend na main;
  usuário revisa o diff antes de cada commit.
- Python: o PyCharm usa a venv `venv-specshop`; o caminho ainda não foi informado. O
  shell do agente não a ativa (python global 3.9). Pedir o caminho antes de rodar testes.
- Pendências herdadas do core (3.2/3.3 de deploy, tag `v1.0`, `merge=ours`, regras de
  agente do projeto) pertencem ao core e não são trabalho deste repositório.
