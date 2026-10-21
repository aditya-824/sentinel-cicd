#!/usr/bin/env bash
# Post-deployment smoke test.  Usage: scripts/smoke-test.sh [WEB_URL] [API_URL]
set -uo pipefail
WEB="${1:-http://localhost:8080}"
API="${2:-http://localhost:4000}"
fail=0

check() { # name, url, expected-substring
  local body
  body="$(curl -fsS --max-time 60 "$2" 2>&1)" && grep -q -- "$3" <<<"$body" \
    && echo "PASS  $1" || { echo "FAIL  $1  ($2 should contain '$3')"; fail=1; }
}

echo "Waiting for API at $API ..."
for i in $(seq 1 60); do
  curl -fsS "$API/api/health" >/dev/null 2>&1 && break
  sleep 2
  [ "$i" = 60 ] && { echo "FAIL  API never became healthy"; exit 1; }
done

check "API health reports database connected" "$API/api/health" '"database":"connected"'
check "Both ESA datasets are seeded"          "$API/api/datasets" 'esamission2'
check "Telemetry channels are served"         "$API/api/telemetry/channels?dataset=esamission1" '"subsystem"'
check "PCA anomaly detection runs end-to-end" "$API/api/detection/pca?dataset=esamission1" 'PCA reconstruction error'
check "Frontend is served"                    "$WEB/" '<div id="root">'
check "Frontend proxies /api to the backend"  "$WEB/api/health" '"status":"ok"'

[ "$fail" = 0 ] && echo "All smoke tests passed." || echo "Smoke tests FAILED."
exit "$fail"
