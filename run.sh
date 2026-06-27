#!/bin/bash

# Cleanly kill both servers when you press Ctrl+C
trap "kill 0" SIGINT SIGTERM EXIT

echo "🚀 Starting Backend (FastAPI)..."
cd backend
source .venv/bin/activate
uvicorn server:app --reload --port 8000 &

echo "🚀 Starting Frontend (React)..."
cd ../frontend
npm start &

echo ""
echo "✅ Both servers are running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   Press Ctrl+C to stop both."
echo ""
wait
