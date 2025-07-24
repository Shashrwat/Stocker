#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Ensure we are in the root of the repository where 'api' and 'public' reside.
cd "$(dirname "$0")" || exit 1 

echo "Current working directory: $(pwd)"
echo "Contents of current directory:"
ls -F 

# Verify 'public' directory exists
if [ ! -d "public" ]; then
  echo "Error: 'public' directory not found at $(pwd)/public. Static files will fail to serve."
  exit 1 
fi
echo "'public' directory found."

# Pre-command to ensure all necessary directories for Gunicorn are there
# and force python buffers to flush earlier for better logging
export PYTHONUNBUFFERED=1

# Start Gunicorn with Uvicorn workers
echo "Starting Gunicorn..."
gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:"$PORT" \
    --timeout 120 \
    --graceful-timeout 60 \
    api.index:app

# Note: Render usually handles health checks via the dashboard settings.
# If you keep hitting 502, also check Render dashboard settings for:
# - Health Check Path: /
# - Health Check Timeout: Try increasing this to 60 or 120 seconds if available on free tier.