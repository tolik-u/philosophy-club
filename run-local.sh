#!/usr/bin/env bash
# Run local dev environment: backend (Flask) + frontend (static file server)
# Usage: ./run-local.sh
#
# NOTE: The frontend JS has apiBase hardcoded to production.
# For local testing, temporarily change apiBase in docs/app.js and docs/admin.js
# from "https://philosophy-club.onrender.com" to "http://localhost:8080"

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# Backend
echo "[*] Starting backend on http://localhost:8080 ..."
cd "$SCRIPT_DIR/be"
if [ ! -d "venv" ]; then
  echo "[*] Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
python app.py &
BACKEND_PID=$!

# Frontend
echo "[*] Starting frontend on http://localhost:8000 ..."
cd "$SCRIPT_DIR/docs"
python3 -m http.server 8000 &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  Frontend: http://localhost:8000"
echo "  Backend:  http://localhost:8080"
echo "  Press Ctrl+C to stop both"
echo "========================================="
echo ""

wait
