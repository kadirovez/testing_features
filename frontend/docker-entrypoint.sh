#!/bin/sh
set -eu

: "${PORT:=8080}"
: "${API_UPSTREAM:=http://127.0.0.1:8000}"

export PORT API_UPSTREAM

envsubst '${PORT} ${API_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
