# Monorepo image — serves both the FastAPI backend and the ingestion monitor.
# Both services share the same image; the compose files set the command per service.
#
# Build context must be the repo root:
#   docker build -t ev-policy-intel .

FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer-cached until requirements.txt changes)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY backend/   ./backend/
COPY ingestion/ ./ingestion/
COPY data/      ./data/

# 'app' package lives at /app/backend; 'ingestion' package lives at /app/ingestion.
# Setting PYTHONPATH lets both be imported without extra sys.path manipulation.
ENV PYTHONPATH=/app/backend:/app

EXPOSE 8000
WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
