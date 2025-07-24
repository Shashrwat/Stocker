#!/usr/bin/env bash

# This script is executed by Render to start your web service.
# It uses Gunicorn to serve the FastAPI application.

# Ensure the 'public' directory exists for static files
# Render should copy your project structure, so 'public' should be relative to this script.
if [ ! -d "public" ]; then
  echo "Error: 'public' directory not found. Static files might not be served correctly."
  # You might want to copy it here if your build process doesn't handle it
  # cp -R /path/to/source/public .
fi

# Start Gunicorn with Uvicorn workers
# -w: number of worker processes
# -k uvicorn.workers.UvicornWorker: specify Uvicorn as the worker class
# api.index:app: points to the 'app' instance in 'index.py' inside the 'api' directory
# --bind 0.0.0.0:$PORT: binds to the host and port provided by Render environment variable
gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.index:app --bind 0.0.0.0:$PORT