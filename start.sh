#!/bin/bash
set -e

PORT="${PORT:-8000}"

if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  cd /app/backend
  alembic upgrade head
else
  echo "DATABASE_URL not set — skipping migrations."
  cd /app/backend
fi

echo "Starting uvicorn on 0.0.0.0:$PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
