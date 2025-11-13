#!/bin/bash

# LowLogic Stop Script
# Stops all running LowLogic services

echo "🛑 Stopping LowLogic services..."

# Stop backend if PID file exists
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
    else
        echo "Backend process not found"
    fi
    rm backend.pid
else
    echo "Backend PID file not found"
fi

# Stop frontend if PID file exists
if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    else
        echo "Frontend process not found"
    fi
    rm frontend.pid
else
    echo "Frontend PID file not found"
fi

# Also try to stop any remaining processes on common ports
echo "Checking for remaining processes..."
pkill -f "python main.py" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "npm run preview" 2>/dev/null || true

echo "✅ LowLogic services stopped"