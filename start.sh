#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Ensure we are in the root of the repository where 'api' and 'public' reside.
# Render usually does this by default, but this is a safeguard.
cd "$(dirname "$0")/.." # This changes directory to the parent of start.sh's location, i.e., repo root.
# Alternative: if you're sure start.sh is always in the root, just: cd $(dirname "$0")

echo "Current working directory: $(pwd)"
echo "Contents of current directory:"
ls -F # List files/folders, showing type (e.g., / for directory)

# Verify 'public' directory exists
if [ ! -d "public" ]; then
  echo "Error: 'public' directory not found at $(pwd)/public. Static files will fail to serve."
  exit 1 # Exit build if public folder is missing
fi
echo "'public' directory found."

# Start Gunicorn with Uvicorn workers
# -w: number of worker processes (usually 2-4 depending on CPU cores)
# -k uvicorn.workers.UvicornWorker: specify Uvicorn as the worker class
# api.index:app: points to the 'app' instance in 'index.py' inside the 'api' directory
# --bind 0.0.0.0:$PORT: binds to the host and port provided by Render environment variable
echo "Starting Gunicorn..."
gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.index:app --bind 0.0.0.0:$PORT