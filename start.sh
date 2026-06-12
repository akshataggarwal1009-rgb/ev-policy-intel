#!/bin/bash
set -e

# Railway injects PORT; default to 8080 if running locally without it.
PORT="${PORT:-8080}"
export PORT

# Run database migrations only when DATABASE_URL is available.
# Skip silently on cold-start if no DB has been provisioned yet.
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
UVICORN_PID=$!

# Substitute $PORT into the nginx config template.
envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx in the foreground (PID 1 equivalent — container lives as long as nginx does).
echo "Starting nginx on port $PORT..."
nginx -g "daemon off;" &
NGINX_PID=$!

# If either process exits, kill the other and exit non-zero so Railway restarts.
wait -n
echo "A process exited unexpectedly. Shutting down..."
kill "$UVICORN_PID" "$NGINX_PID" 2>/dev/null || true
exit 1
