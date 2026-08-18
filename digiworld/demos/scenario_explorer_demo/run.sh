#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.

# Scenario Explorer Demo - Startup Script

echo "========================================="
echo "  Scenario Explorer Demo - Startup"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "Error: Please run this script from the scenario_explorer_demo directory"
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup EXIT INT TERM

# Create log files
BACKEND_LOG="/tmp/scenario_explorer_backend.log"
FRONTEND_LOG="/tmp/scenario_explorer_frontend.log"

# Start backend with output to console AND log file
echo "Starting backend server..."
cd backend
uvicorn main:app --reload --port 8000 2>&1 | tee "$BACKEND_LOG" &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 3

# Start frontend (in background, logs to file)
echo "Starting frontend development server..."
cd frontend
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================="
echo "  Demo is starting up!"
echo "========================================="
echo ""
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
echo ""
echo "Backend logs: $BACKEND_LOG"
echo "Frontend logs: $FRONTEND_LOG"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait
