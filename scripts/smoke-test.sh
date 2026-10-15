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

echo "Checking the submission write path (UI proxy -> API -> RabbitMQ -> Coordinator -> Postgres)..."
psql_query() {
  docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$1"' sh "$1"
}
status_and_body="$(curl -sS --max-time 10 -w '\n%{http_code}' -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Test","birthDate":"1990-01-15","reminderWindowDays":7}' \
  "http://localhost:${FRONTEND_PORT}/api/birthdays" 2>&1 || true)"
status="${status_and_body##*$'\n'}"
body="${status_and_body%$'\n'*}"
id="$(sed -n 's/.*"id":"\([0-9a-f-]\{36\}\)".*/\1/p' <<<"$body")"
if [[ "$status" == "202" && -n "$id" ]]; then
  pass "POST /api/birthdays accepted ($id)"
  row=""
  for _ in $(seq 1 20); do
    row="$(psql_query "select name, next_reminder_on is not null from birthdays where id = '${id}'" || true)"
    [[ -n "$row" ]] && break
    sleep 0.5
  done
  if [[ "$row" == "Smoke Test|t" ]]; then
    pass "Coordinator stored the birthday with next_reminder_on"
  else
    fail "birthday ${id} not stored within 10s (got: '${row}')"
  fi
else
  fail "POST /api/birthdays returned ${status}: ${body}"
fi

status="$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Test","birthDate":"1990-01-15","reminderWindowDays":15}' \
  "http://localhost:${FRONTEND_PORT}/api/birthdays" || true)"
if [[ "$status" == "400" ]]; then
  pass "POST /api/birthdays rejects an invalid reminder window"
else
  fail "invalid submission returned ${status}, expected 400"
fi

if (( failures > 0 )); then
  echo "${failures} check(s) failed."
  exit 1
fi
echo "All checks passed."
