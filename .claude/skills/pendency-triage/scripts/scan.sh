#!/usr/bin/env bash
# Varre o projeto em busca de marcadores de pendência (TODO/FIXME).
# Saída: uma linha por ocorrência no formato  arquivo:linha:texto
# Uso: bash scan.sh [caminho]   (caminho padrão: diretório atual)

set -euo pipefail

ROOT="${1:-.}"

# Marcadores procurados. Casa TODO/FIXME como palavra (case-sensitive),
# tipicamente em comentários: "// TODO:", "# FIXME -", etc.
PATTERN='\b(TODO|FIXME)\b'

# Diretórios/arquivos a ignorar na varredura.
EXCLUDE_DIRS='.git,node_modules,dist,build,coverage,vendor,.next,.cache'
EXCLUDE_GLOBS=('*.min.js' '*.lock' '*.map')

args=(-rnE --color=never)
IFS=',' read -ra DIRS <<< "$EXCLUDE_DIRS"
for d in "${DIRS[@]}"; do args+=("--exclude-dir=$d"); done
for g in "${EXCLUDE_GLOBS[@]}"; do args+=("--exclude=$g"); done

# grep retorna 1 quando não há match; tratamos como "sem pendências".
if ! grep "${args[@]}" "$PATTERN" "$ROOT"; then
  echo "Nenhum marcador TODO/FIXME encontrado em '$ROOT'." >&2
  exit 0
fi
