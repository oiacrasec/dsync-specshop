---
name: project-skills
description: Consulta as skills compartilhadas do projeto em .ai/skills/. Use quando o usuário perguntar quais skills/padrões o projeto tem, pedir para seguir "a skill do projeto", ou ANTES de tarefas que podem ter um padrão definido — em especial criar/dividir/revisar commits ("commita", "faz o commit"), explicar algo ao usuário ("o que é", "como funciona", "explica"), início de sessão e retomada (skills modo-de-trabalho e handoff), troca de LLM ou fim de etapa (skill handoff), revisar código, PRs ou diffs e checar segurança (skill owasp-top-10) e performance (skill revisao-performance), terminar uma etapa do plano de entrega (skill validar-etapa), criar, alterar ou revisar telas, componentes, formulários, menus, mensagens ou layout, inclusive no FigCraft (skill leis-do-ux), criar ou alterar endpoints e respostas de erro da API (skill erros-api-rfc9457), verificar ambiente, plugins, LSP, codegraph ou rtk (skill verificar-ambiente), qualquer lacuna, ambiguidade, conflito ou divergência entre docs, código, pedido do usuário, regras ou leis (skill questionador: nunca supor, pare e pergunte), QUALQUER funcionalidade nova ou alterada (comece pela skill conformidade-legal, que indica as leis aplicáveis: LGPD, Marco Civil, CDC, acessibilidade, ECA Digital, assinatura eletrônica, LAI, crédito, saúde, Banco Central, IA, crimes cibernéticos, propriedade intelectual), além de arquitetura, API, testes e documentação.
---

# Skills do projeto

As skills do datasync-core ficam em `.ai/skills/<nome>/` e são agnósticas de agente. Cada uma tem um `SKILL.md` (procedimento, com frontmatter `name` e `description`) e pode ter arquivos de apoio (ex.: `reference.md`).

## Como consultar

1. **Listar** as skills disponíveis, lendo o frontmatter de cada uma:
   ```bash
   for f in .ai/skills/*/SKILL.md; do echo "== $f"; sed -n '2,3p' "$f"; done
   ```
2. **Escolher** a skill cuja `description` corresponde à tarefa atual. Se nenhuma corresponder, dizer isso ao usuário e seguir sem skill.
3. **Ler** o `SKILL.md` escolhido por inteiro e seguir as instruções. Abrir os arquivos de apoio só quando o `SKILL.md` indicar ou quando precisar de detalhes.

## Ao responder "quais skills existem?"

Apresentar uma tabela com nome, descrição e caminho de cada skill encontrada. Não inventar skills: a lista vem sempre do diretório, nunca de memória.

## Regras

- `.ai/skills/` é a única fonte de verdade; não duplicar nem criar atalhos em `.claude/skills/`.
- Ao criar uma skill nova, colocar em `.ai/skills/<nome>/SKILL.md` com frontmatter `name` e `description`.
