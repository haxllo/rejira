#!/usr/bin/env bash
set -euo pipefail

# Fail the build if any forbidden app-level guard is found.
# RLS is the only authorization check — no app-side requireRole helpers allowed.
patterns='requireRole|requireOwner|requireAdmin|isInRole|requireWorkspaceOwner|requireWorkspaceAdmin'

matches=$(grep -rn -E "$patterns" \
  apps/web/lib \
  apps/web/components \
  apps/web/app \
  apps/web/hooks \
  --include='*.ts' --include='*.tsx' 2>/dev/null || true)

if [ -n "$matches" ]; then
  echo "ERROR: forbidden app-level guards found (RLS is the only authorization check):"
  echo "$matches"
  exit 1
fi

echo "OK: no app-level role guards (RLS-only authorization)"
