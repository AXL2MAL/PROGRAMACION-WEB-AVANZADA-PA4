#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export NEXT_TELEMETRY_DISABLED=1 NG_CLI_ANALYTICS=false
export npm_config_cache="${npm_config_cache:-$PWD/.local/npm-cache}"
panel_args=()
if [[ ${FRECUENCIA_HOSTED:-0} == 1 ]]; then
  export API_ORIGIN="http://127.0.0.1:${FRECUENCIA_API_PORT:-4000}"
  export PANEL_ORIGIN="http://127.0.0.1:${FRECUENCIA_PANEL_PORT:-4200}"
  panel_args=(-- --base-href /admin/)
fi
for project in backend frontend-angular frontend-nextjs; do
  (
    cd "$project"
    npm ci --include=dev --no-audit --no-fund
    if [[ $project == frontend-angular ]]; then
      npm run build "${panel_args[@]}"
    else
      npm run build
    fi
  )
done
if [[ ${FRECUENCIA_HOSTED:-0} != 1 ]]; then
  (cd qa && npm ci --no-audit --no-fund)
fi
