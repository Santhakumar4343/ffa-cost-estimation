#!/bin/sh
set -e

# Create tables once, before any worker starts (avoids a race between workers).
python -c "from app.db import init_db; init_db()"

# Re-price estimates saved under an older pricing model (new version, audited, approvals reset).
python -c "from app.service import upgrade_legacy_estimates as u; n = u(); print(f'Re-priced {n} estimate(s) with the current pricing model.') if n else None"

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
