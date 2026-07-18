#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python -m uvicorn main:app --reload &
API_PID=$!

python -m http.server 5500 --directory frontend &
FRONT_PID=$!

cleanup() {
    kill "$API_PID" "$FRONT_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "API:      http://127.0.0.1:8000"
echo "Frontend: http://127.0.0.1:5500"

wait
