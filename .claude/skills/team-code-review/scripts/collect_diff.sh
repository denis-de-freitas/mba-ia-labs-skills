#!/usr/bin/env bash
# Collect the changes to review. Prefers staged changes; falls back to the
# diff against the default branch (origin/main) when nothing is staged.
set -euo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Not a git repository." >&2
  exit 1
fi

staged="$(git diff --cached --stat)"
if [ -n "$staged" ]; then
  echo "### Reviewing STAGED changes"
  git diff --cached
  exit 0
fi

# No staged changes — compare current branch to the merge-base with main.
base="$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "")"
if [ -n "$base" ]; then
  echo "### Reviewing changes since $(git rev-parse --short "$base")"
  git diff "$base"...HEAD
else
  echo "### No staged changes and no main branch found; showing working tree diff"
  git diff
fi
