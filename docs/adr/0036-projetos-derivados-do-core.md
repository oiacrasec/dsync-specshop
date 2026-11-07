# 0036 — Projetos derivados do core

- **Status:** Proposto
- **Data:** 2026-10-18
- **Revisão:** 2026-11-07 — ADRs dos projetos derivados passam a numerar a partir de 2000.

## Contexto

O `datasync-core` é a base de vários projetos (o primeiro é o SPECSHOP). Cada projeto
tem repositório e ritmo próprios, mas deve continuar recebendo as evoluções de
arquitetura do core. Mais tarde, um projeto pode ser vendido, e o comprador precisa de
um core próprio, sem acesso ao core original.

## Decisão

```text
            core  (mantém e evolui a arquitetura)
          /   |   \
   projeto1 projeto2 projeto3     cada um com git próprio e ritmo próprio
          \   |   /
        recebem do core (nunca o contrário)
```

1. **Fork com histórico.** Cada projeto nasce de um fork do core (histórico preservado)
   e mantém um remote chamado `core`. O histórico em comum é o que permite o merge.
2. **Fluxo em uma só direção.** Projetos puxam do core; o core nunca recebe merge de
   um projeto. Se uma melhoria de projeto servir a todos, ela entra no core como
   commit novo e limpo. Isso impede que código de um cliente vá parar no core e, por
   consequência, no fork entregue a outro comprador.
3. **Atualização manual e deliberada.** `git fetch core && git merge core/<tag>`. O git
   não puxa sozinho, e cada projeto decide quando atualizar. *(Proposta:)* o core marca
   versões estáveis com tags (`v1.0`, `v1.1`) e os projetos fazem merge de tags, não
   da `main` em andamento.
4. **O projeto só acrescenta.** O projeto não edita arquivos que vêm do core. Código,
   telas e docs do projeto ficam em apps, features e arquivos novos, ao lado dos do
   core. Se o projeto precisar de uma mudança num arquivo do core, a mudança é pedida
   ao core, e não feita no projeto.
5. **Arquivos que pertencem ao projeto.** Alguns arquivos existem no core, mas dizem
   respeito ao estado de cada projeto. Em caso de conflito, vale a versão do projeto:
   `README.md`, `docs/adr/projeto.md`, `docs/domain/`, `docs/plans/`, `.ai/handoff.md`, `.ai/knowledge/log.md` e
   `frontend/src/app/pages/dashboards/` (home vazia no core; cada projeto implementa a sua),
   `backend/config/project.py` (`PROJECT_APPS`, apps do projeto) e
   `backend/config/api/project.py` (rotas da API v1 do projeto), vazios no core.
   Pode-se automatizar com `merge=ours` no `.gitattributes`, mais
   `git config merge.ours.driver true` em cada clone (essa configuração não é versionada).
6. **ADRs do projeto numeram a partir de 2000.** O core usa 0001–1999; cada projeto
   derivado começa em `2000` (`docs/adr/2000-<resumo>.md`, `2001-...`). Assim o core pode
   criar o ADR 0044 sem colidir com um ADR do projeto, e o merge do core não renumera nada.
   A faixa é a mesma em todos os projetos: um ADR 2000 só tem sentido dentro do seu
   repositório. Um prefixo explícito (ex.: `ADR-F`) fica para depois, se a faixa não bastar.
   O índice dos ADRs do projeto é `docs/adr/projeto.md`, pois o `docs/adr/README.md` é do
   core e o projeto não o edita.
7. **Venda de um projeto.** Cria-se uma cópia do core que preserve o histórico
   (`git clone --mirror` seguido de `git push --mirror` para um repositório novo e
   vazio). No repositório do comprador: `git remote set-url core <nova-origem>`. Para
   cortar o vínculo: `git remote remove core`. Cópia sem histórico (`git init` do zero)
   quebra o merge e não deve ser usada.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Submodule | o core fica somente leitura, preso a um commit; projetos precisam acrescentar apps e features dentro da mesma estrutura |
| Subtree | exige o core numa subpasta, o que quebra `backend/` e `frontend/` na raiz |
| Pacote (pip/npm) | exige o core como biblioteca instalável; hoje ele é um template. Pode ser reavaliado no futuro |
| Cópia sem histórico | perde o ancestral comum; cada atualização vira conflito em quase todos os arquivos |

## Consequências

- O core precisa ser tratado como produto compartilhado: toda mudança nele chega a
  todos os projetos, e mudanças incompatíveis exigem aviso e versão nova.
- Projetos não adicionam migrations em apps do core; isso evita colisão com migrations
  novas do core. O código de domínio do projeto vive em apps próprios.
- O fork entregue a um comprador leva o histórico completo do core. Antes de entregar,
  revisar o histórico (nada que o comprador não deva ver). Direitos do comprador sobre o
  código do core são definidos em contrato, fora deste ADR.
- Fork de repositório privado no GitHub continua privado, e o GitHub não permite fork
  de um repositório para a mesma conta; nesses casos usa-se o espelhamento do item 6.

## Referência

[Passo a passo para criar um projeto](../derived-projects/README.md).

## Pendências

- Como um projeto acrescenta regras de agente sem editar o `AGENTS.md` do core (por
  exemplo, um arquivo adicional que o hook de `.claude/settings.json` também carregue).
- Criar a primeira tag de versão no core.
- Detalhar a lista de arquivos do item 5 conforme os projetos reais mostrarem conflitos.
