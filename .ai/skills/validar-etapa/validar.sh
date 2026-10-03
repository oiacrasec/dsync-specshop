#!/usr/bin/env bash
# Verificações automáticas de fechamento de etapa do backend.
# Uso (na raiz do repositório): bash .ai/skills/validar-etapa/validar.sh
# Sai com código 1 se alguma verificação falhar.

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PY="$ROOT/.venv/Scripts/python"
[ -x "$PY" ] || PY="$ROOT/.venv/bin/python"
FAILS=0

run() {
  local label="$1"; shift
  printf '\n== %s\n' "$label"
  if (cd "$ROOT/backend" && "$@"); then
    printf '  ✅ %s\n' "$label"
  else
    printf '  ❌ %s\n' "$label"
    FAILS=$((FAILS + 1))
  fi
}

run "Testes (pytest)" "$PY" -m pytest -q
run "Lint (ruff check)" "$PY" -m ruff check .
run "Formatação (ruff format)" "$PY" -m ruff format --check .
run "Migrations pendentes" "$PY" manage.py makemigrations --check --dry-run
run "System checks" "$PY" manage.py check
run "Checks de produção (--deploy)" env DJANGO_ALLOWED_HOSTS=exemplo.com.br \
  "$PY" manage.py check --deploy --fail-level WARNING --settings=config.settings.production

printf '\n'
if [ "$FAILS" -eq 0 ]; then
  printf '✅ Verificações automáticas OK. Siga para a revisão manual (SKILL.md, passos 3 a 7).\n'
else
  printf '❌ %d verificação(ões) falharam. Corrija antes de continuar.\n' "$FAILS"
  exit 1
fi
