#!/bin/bash
# OptiRoute Start Script
# Starts the main web application and optionally the dispatch service
#
# Environment Variables:
#   START_DISPATCH_SERVICE - Set to "true" to also start the dispatch service (default: false)
#   DISPATCH_SERVICE_PORT  - Port for dispatch service (default: 3001)
#
# Usage:
#   ./start.sh                              # Start main app only (default)
#   START_DISPATCH_SERVICE=true ./start.sh  # Start both services

cd /workspace

# Configuration
DISPATCH_SERVICE_ENABLED="${START_DISPATCH_SERVICE:-false}"
DISPATCH_PORT="${DISPATCH_SERVICE_PORT:-3001}"

# Function to cleanup background processes on exit
cleanup() {
    echo "Shutting down services..."
    if [ -n "$DISPATCH_PID" ]; then
        kill $DISPATCH_PID 2>/dev/null
        echo "Dispatch service stopped"
    fi
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

# Start dispatch service if enabled
if [ "$DISPATCH_SERVICE_ENABLED" = "true" ]; then
    echo "Starting dispatch service on port $DISPATCH_PORT..."
    
    # Check if dispatch service is built
    if [ ! -f "dispatch-service/dist/index.js" ]; then
        echo "Building dispatch service..."
        (cd dispatch-service && npm run build)
    fi
    
    # Start dispatch service in background
    (cd dispatch-service && PORT=$DISPATCH_PORT npm start) &
    DISPATCH_PID=$!
    echo "Dispatch service started with PID $DISPATCH_PID"
    
    # Give it a moment to start
    sleep 2
fi

# Start main web application
echo "Starting main web application..."
exec node web-launcher/server.js
