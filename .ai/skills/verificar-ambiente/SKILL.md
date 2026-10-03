---
name: verificar-ambiente
description: Verifica se o ambiente de desenvolvimento está completo (ferramentas, .venv com Django LTS, CodeGraph, servidores LSP, plugins e hooks do Claude Code). Use no início de uma sessão em máquina nova, quando o usuário pedir para checar o ambiente ou plugins, ou quando uma ferramenta (LSP, codegraph, rtk) falhar.
---

# Verificar ambiente

## Como rodar

Na raiz do repositório:

```bash
bash .ai/skills/verificar-ambiente/check.sh
```

Mostra ✅/❌ por item e sai com código **1** se algo obrigatório faltar. Apresente o resultado ao usuário em formato visual (skill `explicacao-eficiente`) e **pergunte antes de instalar** qualquer coisa.

## O que é verificado

| Grupo | Item | Esperado |
|---|---|---|
| Ferramentas | git, node, npm | instalados |
| | rtk | instalado (compacta saída de comandos) |
| Python | `.venv` na raiz | Python 3.14 |
| | Django | **5.2.x (LTS)** |
| CodeGraph | CLI | instalado |
| | índice | `.codegraph/` existe e `codegraph status` responde |
| LSP | pyright | instalado |
| | typescript-language-server + tsserver | TypeScript **5.x** (o 7 não traz `tsserver`) |
| Claude Code | plugins | `pyright-lsp`, `typescript-lsp`, `remember`, `frontend-design`, `coderabbit`, `code-simplifier`, `security-guidance`, `watermarks-remover`, `andrej-karpathy-skills`: instalados **e** habilitados |
| | hook rtk | `PreToolUse` com matcher `Bash\|PowerShell` → `rtk hook claude` |
| | MCP codegraph | servidor `codegraph` em `~/.claude.json` |
| | hook do projeto | `SessionStart` em `.claude/settings.json` carregando o `AGENTS.md` |
| Codex | hook rtk | `PreToolUse` com `rtk hook codex` em `~/.codex/config.toml` |
| | MCP codegraph | `[mcp_servers.codegraph]` em `~/.codex/config.toml` |

As seções Claude Code e Codex são ignoradas se `~/.claude/` ou `~/.codex/` não
existirem. O Codex lê o `AGENTS.md` nativamente; as skills chegam a ele pelas
referências do `AGENTS.md`.

Fora do escopo, por decisão do projeto: `kotlin-lsp` e `swift-lsp` (a stack é Django + Angular).

## Como corrigir

| Falta | Correção |
|---|---|
| Django / dependências | `pip install -U -r backend/requirements/development.txt` (com o `.venv` da raiz ativo) |
| codegraph CLI | Windows: `irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 \| iex` · Linux/macOS: `curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh \| sh` · ou `npm i -g @colbymchenry/codegraph`. **Abra um terminal novo** depois. |
| MCP codegraph | `codegraph install --target=claude` |
| índice do projeto | `codegraph init` (lock travado: `codegraph unlock`; atualizar: `codegraph sync`) |
| pyright / TS LSP | `npm install -g pyright typescript@5 typescript-language-server` |
| plugin | no Claude Code: `/plugin install <nome>@<marketplace>` (marketplaces extras: `/plugin marketplace add guillaumemeyer/watermarks-remover` e `/plugin marketplace add forrestchang/andrej-karpathy-skills`) |
| hook rtk | `~/.claude/settings.json` → `PreToolUse`, matcher `Bash\|PowerShell`, comando `rtk hook claude` |
| hook do projeto | restaurar `.claude/settings.json` do repositório |
| rtk no Codex | `rtk init -g --codex` (hook `PreToolUse` + `AGENTS.md` + `RTK.md`) |
| MCP codegraph no Codex | `codegraph install --target=codex` |

Depois de instalar plugins, LSPs ou o MCP, **reinicie o Claude Code** e rode a verificação de novo.

Fonte do CodeGraph: https://github.com/colbymchenry/codegraph#get-started

## Manutenção

Mudou a lista de ferramentas ou plugins do projeto → atualizar **juntos** o `check.sh` e a tabela acima. Divergência entre os dois → skill `questionador`.
