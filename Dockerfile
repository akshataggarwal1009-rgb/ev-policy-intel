# Railway production image — single container serving both the React SPA and
# the FastAPI backend. nginx handles static files and proxies /api/ to uvicorn
# running on localhost:8000.
#
# Build context: repo root
#   docker build -f Dockerfile.railway -t ev-policy-intel-railway .

# ── Stage 1: build the Vite/React frontend ────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: combined Python backend + nginx ──────────────────────────────────
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc nginx gettext-base \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps (cached until requirements.txt changes)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY backend/   ./backend/
COPY ingestion/ ./ingestion/
COPY data/      ./data/

ENV PYTHONPATH=/app/backend:/app

# Frontend static files built in stage 1
COPY --from=frontend-build /app/dist /app/frontend/dist

# nginx config template (PORT is substituted at startup by envsubst)
COPY nginx.railway.conf /etc/nginx/conf.d/default.conf.template

# Remove the default nginx site that ships with the package
RUN rm -f /etc/nginx/sites-enabled/default

# Startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
