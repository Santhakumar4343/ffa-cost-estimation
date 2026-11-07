# syntax=docker/dockerfile:1.7
# FFA Estimator — frontend (React SPA served by nginx on port 5152)
#   docker build -t ffa-estimator-frontend .
#   docker run -p 5152:5152 -e BACKEND_URL=http://backend:8880 ffa-estimator-frontend

# ---- build: type-check + production bundle ----
FROM node:20.18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- runtime: unprivileged nginx (runs as non-root) ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
# The official entrypoint renders /etc/nginx/templates/*.template with env vars into conf.d/
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
ENV BACKEND_URL=http://backend:8880
EXPOSE 5152
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:5152/healthz || exit 1
