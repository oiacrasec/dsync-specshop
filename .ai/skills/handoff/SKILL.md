---
name: handoff
description: Passagem de bastão entre sessões e entre agentes (Claude, Codex ou outro). Use ao final de TODA etapa (dentro da validar-etapa), quando o usuário disser que vai trocar de LLM ou encerrar a sessão, e no INÍCIO de toda sessão para retomar o trabalho a partir do .ai/handoff.md.
---

# Handoff

> **Regra de ouro:** o estado do trabalho vive no **repositório**, não na conversa.
> Qualquer agente deve conseguir retomar só com o `AGENTS.md`, o `.ai/handoff.md` e o
> plano ativo.

## Ao retomar (início de sessão)

1. Ler a skill `modo-de-trabalho`.
2. Ler o `.ai/handoff.md` e o plano indicado nele (`docs/plans/`).
3. Conferir com `git log -5` e `git status` se o estado bate com o handoff.
   Divergência → skill `questionador`.
4. Dizer ao usuário, em poucas linhas, onde parou e qual é o próximo passo, e
   **esperar a confirmação** antes de continuar.

## Ao passar o bastão

Quando:
- ao final de **toda** etapa (passo da skill `validar-etapa`);
- quando o usuário disser que vai trocar de LLM ou encerrar;
- antes de uma pausa longa no meio de uma etapa.

Como:

1. Atualizar o `.ai/handoff.md` (formato abaixo). Escrever **fatos**: nada de "quase
   pronto" sem dizer exatamente o que falta.
2. Se houver trabalho **não commitado** no meio de uma etapa:
   - testes passando → commit do que está pronto (skill `git-commit`), descrevendo o
     que falta no handoff;
   - testes falhando → **não** commitar código quebrado; descrever no handoff o estado e
     os arquivos alterados, e avisar o usuário.
3. Commitar o `.ai/handoff.md` (`docs(ai): update handoff`), salvo quando já entrou no
   commit da etapa.
4. Confirmar ao usuário que o bastão está pronto para outro agente.

## Formato do `.ai/handoff.md`

```markdown
# Handoff

- **Atualizado em:** AAAA-MM-DD HH:MM
- **Agente:** Claude | Codex | outro
- **Plano ativo:** docs/plans/<arquivo>.md
- **Último commit:** <hash> <mensagem>

## Situação

| Item | Estado |
|---|---|
| Etapa atual | <número e nome> — ⬜ não iniciada / 🔄 em andamento / ✅ concluída |
| Próximo passo exato | <o que fazer a seguir, concreto> |
| Aguardando o usuário? | sim/não — <o quê> |

## Feito nesta etapa
- ...

## Falta nesta etapa
- ...

## Dúvidas abertas
- ...

## Avisos
- <cuidados temporários, ex.: "não rodar migrate antes da etapa 1.1">
```

## Proibido

- ❌ Guardar estado importante só na conversa ou na memória de uma ferramenta específica.
- ❌ Handoff vago ("continuar a implementação").
- ❌ Retomar e sair executando sem confirmar com o usuário onde parou.
