#!/bin/bash

# LowLogic Deployment Script
# Works without Docker for local deployment

echo "🚀 LowLogic Deployment Script"
echo "=============================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists python3; then
    echo "❌ Python 3 is required. Please install Python 3.8+"
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is required. Please install Node.js 16+"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is required. Please install npm"
    exit 1
fi

echo "✅ All prerequisites found"

# Backend deployment
echo ""
echo "🔧 Deploying backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Start backend in background
echo "Starting backend server..."
python main.py &
BACKEND_PID=$!

echo "Backend started with PID: $BACKEND_PID"

cd ..

# Frontend deployment
echo ""
echo "🎨 Deploying frontend..."
cd frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Build for production
echo "Building frontend..."
npm run build

# Start frontend in background
echo "Starting frontend server..."
npm run preview &
FRONTEND_PID=$!

echo "Frontend started with PID: $FRONTEND_PID"

cd ..

echo ""
echo "✅ LowLogic deployment complete!"
echo ""
echo "📱 Access LowLogic at: http://localhost:4173"
echo "🔧 Backend running on: ws://localhost:8765"
echo ""
echo "🛑 To stop all services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📊 To view logs:"
echo "   tail -f backend.log"
echo "   tail -f frontend.log"

# Save PIDs to file for later cleanup
echo "$BACKEND_PID" > backend.pid
echo "$FRONTEND_PID" > frontend.pid

echo "🎉 LowLogic is now running!"