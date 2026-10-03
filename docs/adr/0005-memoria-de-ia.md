# 0005 — Memória e procedimentos para agentes de IA

- **Status:** Aceito
- **Data:** 2026-10-03

## Contexto

O projeto é desenvolvido com vários agentes de IA (Claude Code, Codex e outros).
Cada ferramenta procura instruções em lugares diferentes, e regras duplicadas
divergem com o tempo.

## Decisão

| Camada | Local | Papel |
|---|---|---|
| Regras globais | `AGENTS.md` (raiz) + `backend/AGENTS.md` | como trabalhar; arquivo **único** para todos os agentes |
| Procedimentos | `.ai/skills/<nome>/SKILL.md` | skills agnósticas de agente (processo e conformidade legal) |
| Conhecimento | `.ai/knowledge/` | memória compilada do projeto (derivada; corrigida quando desatualiza) |
| Consultas | `.ai/queries/` | investigações reutilizáveis |
| Código | CodeGraph (`.codegraph/`, não versionado) | grafo do código para navegação |

- **Nada específico de um agente na raiz.** O Claude Code carrega o `AGENTS.md` por
  hook `SessionStart` em `.claude/settings.json`; a skill `.claude/skills/project-skills`
  descobre as skills de `.ai/skills/`. O Codex lê o `AGENTS.md` nativamente.
- Hierarquia de confiança em conflito: código → ADRs → documentação oficial →
  standards/patterns → `.ai/knowledge/`.
- Agentes **nunca inferem nem supõem**; conflitos são levados ao usuário (skill `questionador`).
- Ambiente verificável por `.ai/skills/verificar-ambiente/check.sh`.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| `CLAUDE.md` e equivalentes por agente na raiz | duplicação e divergência; raiz poluída |
| Skills dentro de `.claude/skills/` | prende o conhecimento a uma ferramenta |

## Consequências

- Skill nova vai em `.ai/skills/`; não se duplica em pastas de agentes.
- Mudança de comportamento, arquitetura ou API atualiza `docs/` e `.ai/knowledge/` no mesmo commit.
