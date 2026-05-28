#!/bin/bash
# Render deployment script for FastAPI backend

set -e

echo "Starting Render deployment..."

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations if needed
if [ -f "init_db.py" ]; then
    echo "Initializing database..."
    python init_db.py
fi

echo "Starting application..."
execuvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
