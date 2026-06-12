#!/bin/bash
set -e

# Railway injects PORT; default to 8080 if running locally without it.
PORT="${PORT:-8080}"
export PORT

# Run database migrations only when DATABASE_URL is available.
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  cd /app/backend
  alembic upgrade head
else
  echo "DATABASE_URL not set — skipping migrations."
  cd /app/backend
fi

# Start uvicorn in the background on the internal port.
echo "Starting uvicorn on 127.0.0.1:8000..."
uvicorn app.main:app --host 127.0.0.1 --port 8000 &

# Substitute $PORT into the nginx config template.
envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Replace this shell with nginx so nginx is PID 1.
# The container lives exactly as long as nginx lives.
echo "Starting nginx on port $PORT..."
exec nginx -g "daemon off;"
