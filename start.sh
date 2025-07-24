#!/usr/bin/env bash
set -e

echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -F

if [ ! -d "public" ]; then
  echo "Error: 'public' directory not found!"
  exit 1
fi

echo "Starting Gunicorn..."
gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.index:app --bind 0.0.0.0:$PORT
