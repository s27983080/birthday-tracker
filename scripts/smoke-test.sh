#!/usr/bin/env bash
# Smoke test for the running Docker Compose stack.
# Usage: docker compose up -d --wait && ./scripts/smoke-test.sh
set -euo pipefail

cd "$(dirname "$0")/.."

API_PORT="${API_PORT:-3000}"
COORDINATOR_PORT="${COORDINATOR_PORT:-8082}"
FRONTEND_PORT="${FRONTEND_PORT:-8081}"
SERVICES=(postgres rabbitmq api coordinator frontend)
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-120}"

failures=0
pass() { printf '  \033[32mPASS\033[0m %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; failures=$((failures + 1)); }

echo "Waiting up to ${TIMEOUT_SECONDS}s for services to be healthy..."
deadline=$((SECONDS + TIMEOUT_SECONDS))
for service in "${SERVICES[@]}"; do
  while true; do
    container_id="$(docker compose ps -q "$service")"
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || echo missing)"
    if [[ "$status" == "healthy" ]]; then
      pass "$service is healthy"
      break
    fi
    if (( SECONDS >= deadline )); then
      fail "$service is $status"
      break
    fi
    sleep 2
  done
done

echo "Checking endpoints..."
check() {
  local name="$1" url="$2" expected="$3" body
  if body="$(curl -fsS --max-time 5 "$url" 2>&1)" && [[ "$body" == *"$expected"* ]]; then
    pass "$name"
  else
    fail "$name ($url): $body"
  fi
}

check "API health"                  "http://localhost:${API_PORT}/health"                   '"status":"ok"'
check "Coordinator health"          "http://localhost:${COORDINATOR_PORT}/actuator/health"  '"status":"UP"'
check "Frontend serves the SPA"     "http://localhost:${FRONTEND_PORT}/"                    '<div id="app">'
check "Frontend proxies /api to API" "http://localhost:${FRONTEND_PORT}/api/health"          '"status":"ok"'

echo "Checking database schema..."
if docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select to_regclass('"'"'public.birthdays'"'"')"' | grep -qx birthdays; then
  pass "birthdays table exists"
else
  fail "birthdays table is missing (was the pgdata volume created before db/init ran?)"
fi

if (( failures > 0 )); then
  echo "${failures} check(s) failed."
  exit 1
fi
echo "All checks passed."
