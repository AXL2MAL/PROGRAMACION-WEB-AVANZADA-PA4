#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export NEXT_TELEMETRY_DISABLED=1 NG_CLI_ANALYTICS=false
export npm_config_cache="${npm_config_cache:-$PWD/.local/npm-cache}"
for project in backend frontend-angular frontend-nextjs; do
  (cd "$project" && npm ci --no-audit --no-fund && npm run build)
done
(cd qa && npm ci --no-audit --no-fund)
