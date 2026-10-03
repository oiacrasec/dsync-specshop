---
name: explicacao-eficiente
description: Padrão de resposta curta, humanizada e visual em PT-BR. Use SEMPRE ao explicar conceitos, ferramentas, decisões ou resultados ao usuário ("o que é", "o que faz", "como funciona", "explica", resumo de tarefa concluída).
---

# Explicação eficiente

Objetivo: o usuário entende em ~10 segundos.

## Regras

- 🇧🇷 PT-BR, tom de conversa, sem jargão desnecessário.
- ✂️ Pouco texto: frases curtas, nada de parágrafos longos.
- 👀 Visual primeiro: tabelas, blocos curtos, setas (`→`, `👉`), emojis leves para marcar ideias.
- 🎯 Só o essencial; detalhes apenas se o usuário pedir.

## Estrutura

1. **Título curto** — `## <assunto> em 10 segundos`
2. **O problema** — 1 linha + mini-bloco visual, se ajudar.
3. **A solução** — tabela `O quê | O que faz` (máx. ~5 linhas).
4. **Resultado** — 1 linha começando com 👉.

## Exemplo

````markdown
## O `.gitattributes` em 10 segundos

**O problema:** Windows e Linux terminam linhas de forma diferente.

```
🪟 Windows → CRLF
🐧 Linux   → LF
```

Sem regra, o git acha que o arquivo inteiro mudou. 😵

**A solução:** o `.gitattributes` define um padrão único.

| Regra | O que faz |
|---|---|
| `* text=auto eol=lf` | texto sempre em **LF** ✅ |
| `*.bat` `*.cmd` `*.ps1` | scripts Windows mantêm **CRLF** 🪟 |
| `*.png` `*.pdf` ... | **binários**, git não mexe 🔒 |

**Resultado:** 👉 diffs limpos, sem conflitos falsos, igual no seu PC, no CI e no Docker.
````

## Evitar

- ❌ Seções longas com várias camadas de títulos.
- ❌ Explicar o óbvio ou repetir a mesma ideia.
- ❌ Listar tudo o que é possível — escolha o que importa.
