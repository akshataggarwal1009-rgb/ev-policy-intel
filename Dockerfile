# Railway production image — single container.
# Stage 1 builds the React SPA; stage 2 runs FastAPI which serves
# both the API and the compiled frontend static files.
#
# Build context: repo root

# ── Stage 1: build the Vite/React frontend ────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend serves API + static files ─────────────────────────
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/   ./backend/
COPY ingestion/ ./ingestion/
COPY data/      ./data/

ENV PYTHONPATH=/app/backend:/app

# Frontend static files built in stage 1
COPY --from=frontend-build /app/dist /app/frontend/dist

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
