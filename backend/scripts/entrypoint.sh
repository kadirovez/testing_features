#!/bin/sh
set -eu

missing=""
for name in JWT_SECRET; do
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    missing="${missing} ${name}"
  fi
done

if [ -z "${REDIS_URL:-}" ] && [ -z "${REDISHOST:-}" ]; then
  missing="${missing} REDIS_URL"
fi

if [ -z "${DATABASE_URL:-}" ] && [ -z "${PGHOST:-}" ]; then
  missing="${missing} DATABASE_URL"
fi

if [ -n "$missing" ]; then
  echo "ERROR: Missing required environment variable(s):$missing"
  echo ""
  echo "Railway → your API service → Variables. Minimum set:"
  echo "  JWT_SECRET          — openssl rand -hex 32"
  echo "  DATABASE_URL        — Variable Reference → Postgres → DATABASE_URL (not typed by hand)"
  echo "  REDIS_URL           — \${{Redis.REDIS_URL}}"
  echo "  CELERY_BROKER_URL   — \${{Redis.REDIS_URL}}/1"
  echo "  CELERY_RESULT_BACKEND — \${{Redis.REDIS_URL}}/2"
  exit 1
fi

if [ "${#JWT_SECRET}" -lt 32 ]; then
  echo "ERROR: JWT_SECRET must be at least 32 characters."
  exit 1
fi

if [ -n "${DATABASE_URL:-}" ] && printf '%s' "$DATABASE_URL" | grep -q '{{'; then
  echo "ERROR: DATABASE_URL looks like an unresolved Railway template (contains '{{')."
  echo "Use Variables → Add Variable Reference → Postgres → DATABASE_URL"
  exit 1
fi

if [ -n "${REDIS_URL:-}" ] && printf '%s' "$REDIS_URL" | grep -q '{{'; then
  echo "ERROR: REDIS_URL looks like an unresolved Railway template (contains '{{')."
  echo "Use Variables → Add Variable Reference → Redis → REDIS_URL"
  exit 1
fi

echo "DB config: DATABASE_URL=$([ -n "${DATABASE_URL:-}" ] && echo set || echo unset) PGHOST=${PGHOST:-unset}"
echo "Redis config: REDIS_URL=$([ -n "${REDIS_URL:-}" ] && echo set || echo unset) REDISHOST=${REDISHOST:-unset}"

exec "$@"
