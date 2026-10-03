#!/usr/bin/env bash
# Verifica se o ambiente de desenvolvimento do datasync-core está completo.
# Uso (na raiz do repositório): bash .ai/skills/verificar-ambiente/check.sh
# Sai com código 1 se algum item obrigatório faltar.

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CLAUDE_DIR="$HOME/.claude"
FAILS=0

ok()   { printf '  ✅ %-34s %s\n' "$1" "$2"; }
fail() { printf '  ❌ %-34s %s\n' "$1" "$2"; FAILS=$((FAILS + 1)); }
has()  { command -v "$1" >/dev/null 2>&1; }

section() { printf '\n== %s\n' "$1"; }

# ---------------------------------------------------------------- ferramentas
section "Ferramentas"

has git && ok "git" "$(git --version | cut -d' ' -f3)" || fail "git" "não encontrado"
has node && ok "node" "$(node --version)" || fail "node" "não encontrado"
has npm && ok "npm" "$(npm --version 2>/dev/null)" || fail "npm" "não encontrado"
has rtk && ok "rtk" "$(rtk --version | cut -d' ' -f2)" || fail "rtk" "não encontrado"

# ---------------------------------------------------------------- python / backend
section "Python e backend"

PY="$ROOT/.venv/Scripts/python"
[ -x "$PY" ] || PY="$ROOT/.venv/bin/python"
if [ -x "$PY" ]; then
  ok ".venv (raiz)" "$("$PY" --version 2>&1)"
  DJ="$("$PY" -c 'import django; print(django.get_version())' 2>/dev/null)"
  case "$DJ" in
    5.2.*) ok "Django (LTS 5.2)" "$DJ" ;;
    "")    fail "Django" "não instalado: pip install -U -r backend/requirements/development.txt" ;;
    *)     fail "Django (LTS 5.2)" "versão $DJ fora da LTS" ;;
  esac
else
  fail ".venv (raiz)" "não encontrado"
fi

# ---------------------------------------------------------------- codegraph
section "CodeGraph"

if has codegraph; then
  ok "codegraph CLI" "$(codegraph --version 2>/dev/null)"
  if [ -d "$ROOT/.codegraph" ]; then
    if (cd "$ROOT" && codegraph status >/dev/null 2>&1); then
      FILES="$(cd "$ROOT" && codegraph status 2>/dev/null | sed -n 's/^ *Files: *//p')"
      ok "índice do projeto (.codegraph/)" "${FILES:-?} arquivos"
    else
      fail "índice do projeto" "codegraph status falhou (tente: codegraph unlock && codegraph sync)"
    fi
  else
    fail "índice do projeto" "rode: codegraph init"
  fi
else
  fail "codegraph CLI" "não encontrado"
fi

# ---------------------------------------------------------------- lsp
section "Servidores LSP"

has pyright-langserver && ok "pyright" "$(pyright --version 2>/dev/null | cut -d' ' -f2)" \
  || fail "pyright" "npm install -g pyright"
has typescript-language-server && ok "typescript-language-server" "$(typescript-language-server --version 2>/dev/null)" \
  || fail "typescript-language-server" "npm install -g typescript-language-server"
TSSERVER="$(npm root -g 2>/dev/null)/typescript/lib/tsserver.js"
[ -f "$TSSERVER" ] && ok "typescript (tsserver)" "$(tsc --version 2>/dev/null | cut -d' ' -f2)" \
  || fail "typescript (tsserver)" "npm install -g typescript@5 (o TS 7 não traz tsserver)"

# ---------------------------------------------------------------- claude code
section "Claude Code"

if [ -d "$CLAUDE_DIR" ]; then
  INSTALLED="$CLAUDE_DIR/plugins/installed_plugins.json"
  SETTINGS="$CLAUDE_DIR/settings.json"
  for p in \
    pyright-lsp@claude-plugins-official \
    typescript-lsp@claude-plugins-official \
    remember@claude-plugins-official \
    frontend-design@claude-plugins-official \
    coderabbit@claude-plugins-official \
    code-simplifier@claude-plugins-official \
    security-guidance@claude-plugins-official \
    watermarks-remover@watermarks-remover \
    andrej-karpathy-skills@karpathy-skills
  do
    if ! grep -q "\"$p\"" "$INSTALLED" 2>/dev/null; then
      fail "plugin ${p%@*}" "/plugin install $p"
    elif ! grep -q "\"$p\": *true" "$SETTINGS" 2>/dev/null; then
      fail "plugin ${p%@*}" "instalado, mas desabilitado"
    else
      ok "plugin ${p%@*}" ""
    fi
  done

  grep -q '"matcher": *"Bash|PowerShell"' "$SETTINGS" 2>/dev/null && grep -q 'rtk hook claude' "$SETTINGS" \
    && ok "hook rtk (Bash + PowerShell)" "" \
    || fail "hook rtk (Bash + PowerShell)" "PreToolUse com matcher Bash|PowerShell → rtk hook claude"

  grep -q '"codegraph"' "$HOME/.claude.json" 2>/dev/null \
    && ok "MCP codegraph" "" \
    || fail "MCP codegraph" "rode: codegraph install --target=claude"

  grep -q 'AGENTS.md' "$ROOT/.claude/settings.json" 2>/dev/null \
    && ok "hook do projeto (AGENTS.md)" "" \
    || fail "hook do projeto (AGENTS.md)" ".claude/settings.json sem SessionStart"
else
  printf '  ➖ Claude Code não detectado (seção ignorada)\n'
fi

# ---------------------------------------------------------------- resumo
printf '\n'
if [ "$FAILS" -eq 0 ]; then
  printf '✅ Ambiente completo.\n'
else
  printf '❌ %d item(ns) faltando. Veja as correções acima.\n' "$FAILS"
  exit 1
fi
