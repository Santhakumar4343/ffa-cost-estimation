#!/bin/sh
set -e

# Create tables once, before any worker starts (avoids a race between workers).
python -c "from app.db import init_db; init_db()"

# Optional demo data — never wipes an existing database.
if [ "${SEED_DEMO:-false}" = "true" ]; then
  python seed_demo.py --if-empty
fi

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8880}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --proxy-headers \
  --forwarded-allow-ips "*" \
  --no-server-header
