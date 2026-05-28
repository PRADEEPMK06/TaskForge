#!/usr/bin/env bash
set -euo pipefail

BACKEND="${TASKFLOW_BACKEND_URL:-http://localhost:8000}"
FRONTEND="${TASKFLOW_FRONTEND_URL:-http://localhost:3000}"

echo "Checking backend: ${BACKEND}/health"
curl -fsS "${BACKEND}/health"
echo

echo "Checking frontend: ${FRONTEND}/health"
curl -fsS "${FRONTEND}/health"
echo

