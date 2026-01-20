#!/bin/bash
# Deploy script for fleetfusion-support-agent
# Sources .env file and deploys to Gradient ADK

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables from .env (check both locations)
if [ -f .env ]; then
    echo "✅ Loading environment variables from .env"
    set -a
    source .env
    set +a
elif [ -f .gradient/.env ]; then
    echo "✅ Loading environment variables from .gradient/.env"
    set -a
    source .gradient/.env
    set +a
else
    echo "❌ No .env file found in $SCRIPT_DIR or .gradient/"
    exit 1
fi

# Verify required variables
if [ -z "$DIGITALOCEAN_API_TOKEN" ]; then
    echo "❌ DIGITALOCEAN_API_TOKEN is not set in .env"
    exit 1
fi

if [ -z "$GRADIENT_MODEL_ACCESS_KEY" ]; then
    echo "⚠️  Warning: GRADIENT_MODEL_ACCESS_KEY is not set - inference calls will fail"
fi

echo "🚀 Deploying fleetfusion-support-agent..."
gradient agent deploy "$@"
