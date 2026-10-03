---
name: validar-etapa
description: Fechamento obrigatório de cada etapa (micro-entrega) de implementação. Use SEMPRE ao terminar uma etapa do plano de entrega, antes do commit: roda as verificações automáticas, revisa segurança (owasp-top-10) e performance (revisao-performance), confere ADRs, leis e documentação, e só então commita e reporta.
---

# Validar etapa

> **Regra de ouro:** uma etapa só termina quando passa por **todos** os passos abaixo.
> Nada de juntar etapas para validar depois: cada uma é pequena justamente para ser
> revisada inteira.

## Passo 1 — Escopo

- [ ] A etapa fez **só** o que o plano previa. Algo a mais virou etapa nova ou pergunta
  (skill `questionador`).

## Passo 2 — Verificações automáticas

```bash
bash .ai/skills/validar-etapa/validar.sh
```

Roda: `pytest`, `ruff check`, `ruff format --check`, migrations pendentes, `check` e
`check --deploy` com os settings de produção. Qualquer ❌ → corrigir antes de seguir.

## Passo 3 — Testes da etapa

- [ ] Testes novos cobrem o comportamento da etapa, incluindo caminhos de **erro**.
- [ ] Se a etapa toca dados com escopo: teste de **isolamento entre contratos**
  (e entre organizações) (ADR 0006).
- [ ] Se a etapa cria endpoint: teste de **permissão** (sem permissão → negado) e de
  **contagem de queries** constante (skill `revisao-performance`).

## Passo 4 — Revisão de segurança

Aplicar a skill **`owasp-top-10`** ao diff da etapa e reportar os achados no formato dela.

## Passo 5 — Revisão de performance

Aplicar a skill **`revisao-performance`** ao diff da etapa e reportar os achados no
formato dela.

## Passo 6 — Conformidade

- [ ] O diff respeita os ADRs aceitos (`docs/adr/README.md`). Divergência → `questionador`.
- [ ] Leis aplicáveis checadas pela skill `conformidade-legal`.
- [ ] Erros no padrão da skill `erros-api-rfc9457`.

## Passo 7 — Documentação

- [ ] `backend/AGENTS.md`, `backend/README.md` e o overview (tabela §0) refletem o
  código **desta** etapa, no mesmo commit.
- [ ] Plano de entrega atualizado (etapa marcada como concluída).

## Passo 8 — Commit

Commit pela skill `git-commit` (uma etapa = uma mudança lógica = um commit, em regra).

## Passo 9 — Relatório ao usuário

No formato da skill `explicacao-eficiente`:

| Item | Conteúdo |
|---|---|
| O que foi feito | resumo da etapa |
| Verificações | resultado do passo 2 |
| Segurança | achados do passo 4 (ou "sem achados", com as categorias revisadas) |
| Performance | achados do passo 5 (ou "sem achados") |
| Pendências e dúvidas | o que ficou para o usuário decidir |
| Próxima etapa | qual é, aguardando aprovação |

**Não iniciar a próxima etapa sem a confirmação do usuário.**
