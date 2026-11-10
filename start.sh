#!/bin/bash
set -e

echo "=========================================================="
echo "  Antigravity HR Recruitment Workflow Automation System   "
echo "=========================================================="

# Activate virtualenv
source venv/bin/activate
export PYTHONPATH=backend

# Start backend FastAPI server in background
echo "Starting FastAPI Backend on http://127.0.0.1:8000 ..."
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

trap "kill $BACKEND_PID" EXIT

# Start Vite frontend
echo "Starting React Frontend on http://localhost:5173 ..."
npm run dev --prefix frontend

