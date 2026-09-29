#!/bin/sh
set -eu

missing=""
for name in JWT_SECRET REDIS_URL; do
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    missing="${missing} ${name}"
  fi
done

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

exec "$@"
