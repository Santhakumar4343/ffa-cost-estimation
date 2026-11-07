# syntax=docker/dockerfile:1.7
# FFA Estimator — backend (FastAPI) image
#   docker build --target test    -t ffa-estimator-backend:test .   # runs the test suite
#   docker build --target runtime -t ffa-estimator-backend .        # production image (port 8880)

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

# ---- dependencies (pinned + hash-checked, exported from uv.lock) ----
FROM base AS deps
COPY requirements.txt .
RUN pip install --require-hashes -r requirements.txt

# ---- test stage: the build fails if any test fails ----
FROM deps AS test
COPY requirements-dev.txt .
RUN pip install --require-hashes -r requirements-dev.txt
COPY app ./app
COPY tests ./tests
COPY pyproject.toml seed_demo.py ./
RUN python -m pytest -q

# ---- runtime stage ----
FROM deps AS runtime
RUN groupadd --system app \
    && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app \
    && mkdir -p /data && chown app:app /data
COPY --chown=app:app app ./app
COPY --chown=app:app seed_demo.py docker-entrypoint.sh ./
ENV PORT=8880 \
    DATABASE_URL=sqlite:////data/estimator.db \
    WEB_CONCURRENCY=2 \
    SEED_DEMO=false
USER app
EXPOSE 8880
VOLUME ["/data"]
HEALTHCHECK --interval=15s --timeout=4s --start-period=20s --retries=5 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/health' % os.environ.get('PORT','8880'), timeout=3)" || exit 1
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
