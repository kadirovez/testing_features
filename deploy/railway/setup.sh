#!/usr/bin/env bash
# One-time Railway project wiring (run locally after `npx @railway/cli login`).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLI=(npx --yes @railway/cli)

echo "==> Railway setup for messenger (repo: testing_features)"
echo "    Create a new project in the dashboard or run: railway init"
echo ""
echo "Add plugins in Railway:"
echo "  - PostgreSQL"
echo "  - Redis"
echo ""
echo "Create services from this GitHub repo (branch: front_tests or main)."
echo "Leave Root Directory EMPTY (repo root) for all services — configs live at repo root."
echo ""
echo "1) api"
echo "   Root directory: (empty)"
echo "   Uses railway.toml + Dockerfile"
echo ""
echo "2) worker"
echo "   Root directory: (empty)"
echo "   Variable: RAILWAY_CONFIG_FILE=railway.worker.toml"
echo ""
echo "3) web (optional — UI is also served from the api image at /)"
echo "   Only needed if you want a separate nginx frontend service."
echo ""
echo "4) minio"
echo "   Root directory: (empty)"
echo "   Variable: RAILWAY_CONFIG_FILE=railway.minio.toml"
echo "   Mount volume at /data (Railway UI → service → Volumes)"
echo "   Variables: MINIO_ROOT_USER, MINIO_ROOT_PASSWORD"
echo "   Generate public domain (port 9000) for browser uploads"
echo ""
echo "API + worker service variables (REQUIRED — deploy fails without JWT_SECRET):"
cat <<'VARS'
JWT_SECRET=<openssl rand -hex 32>   # required, min 32 chars
# In Railway UI: Variables → Add Variable Reference (do not paste ${{...}} as plain text)
DATABASE_URL=<reference Postgres DATABASE_URL>
REDIS_URL=<reference Redis REDIS_URL>
# Celery DB indexes are applied automatically; you do not need to set these on Railway:
# CELERY_BROKER_URL=/1 CELERY_RESULT_BACKEND=/2
CORS_ORIGINS=["https://${{web.RAILWAY_PUBLIC_DOMAIN}}"]
S3_ENDPOINT_URL=http://${{minio.RAILWAY_PRIVATE_DOMAIN}}
S3_PUBLIC_ENDPOINT_URL=https://${{minio.RAILWAY_PUBLIC_DOMAIN}}
S3_ACCESS_KEY=<same as MINIO_ROOT_USER>
S3_SECRET_KEY=<same as MINIO_ROOT_PASSWORD>
S3_BUCKET=messenger-media
LOG_JSON=true
VARS
echo ""
echo "Link CLI to project (from repo root):"
echo "  cd \"$ROOT\" && ${CLI[*]} link"
echo "Deploy current branch:"
echo "  ${CLI[*]} up"
