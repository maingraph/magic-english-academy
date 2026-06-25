#!/usr/bin/env sh
set -eu

mkdir -p backups
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U magic -d magic_english -Fc > "backups/magic-english-${timestamp}.dump"
echo "Backup written to backups/magic-english-${timestamp}.dump"
