#!/bin/bash

echo "🧪 Testing LowLogic Desktop App"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run from the frontend directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Installing Electron dependencies..."
npm install electron electron-builder concurrently wait-on --save-dev

echo "🏗️ Building frontend..."
npm run build

echo "🚀 Starting Electron app (test mode)..."
echo "   The app should open automatically"
echo "   Check for the LowLogic window"
echo ""
echo "   To stop: Ctrl+C or close the window"

# Start Electron in test mode
npm run electron:dev