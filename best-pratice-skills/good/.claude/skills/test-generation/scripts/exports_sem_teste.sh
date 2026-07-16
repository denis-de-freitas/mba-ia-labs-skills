#!/usr/bin/env bash
# exports_sem_teste.sh — lista funções exportadas que não têm arquivo de teste.
# stdlib puro, zero dependência. Uso: bash exports_sem_teste.sh [DIRETORIO]
set -euo pipefail

ALVO="${1:-./src}"
[ -d "$ALVO" ] || { echo "AVISO: '$ALVO' não existe."; exit 0; }

ENCONTRADOS=0
while IFS= read -r f; do
  case "$f" in *.test.js|*.spec.js) continue;; esac
  base="${f%.js}"
  # já existe teste correspondente?
  [ -f "${base}.test.js" ] || [ -f "${base}.spec.js" ] && continue
  # tem export de função?
  if grep -nE '(export[[:space:]]+(default[[:space:]]+)?function|module\.exports|exports\.[A-Za-z])' "$f" >/dev/null 2>&1; then
    nomes=$(grep -oE 'export[[:space:]]+(default[[:space:]]+)?function[[:space:]]+[A-Za-z0-9_]+' "$f" \
            | awk '{print $NF}' | paste -sd, - 2>/dev/null || true)
    printf '%s — sem teste (exports: %s)\n' "$f" "${nomes:-?}"
    ENCONTRADOS=$((ENCONTRADOS+1))
  fi
done < <(find "$ALVO" -type f -name '*.js' -not -path '*/node_modules/*')

echo "---"
echo "Arquivos com export sem teste: $ENCONTRADOS"
