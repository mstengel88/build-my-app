#!/bin/sh
set -eu

echo "[entrypoint] Creating nginx temp directories..."

mkdir -p \
  /var/cache/nginx/client_temp \
  /var/cache/nginx/proxy_temp \
  /var/cache/nginx/fastcgi_temp \
  /var/cache/nginx/uwsgi_temp \
  /var/cache/nginx/scgi_temp

echo "[entrypoint] Starting nginx..."

exec nginx -g "daemon off;"
