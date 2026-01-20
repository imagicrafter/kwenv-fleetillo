#!/bin/bash
# Run comprehensive evaluation on fleetfusion-support-agent

echo "🔍 Running OptiRoute Support Agent Evaluation..."
echo "================================================"

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "📋 Loading environment from .env..."
    set -a  # automatically export all variables
    source .env
    set +a
fi

# Set timestamp for results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="evaluations/results/evaluation_${TIMESTAMP}.json"

# Check if gradient CLI is installed
if ! command -v gradient &> /dev/null; then
    echo "❌ Gradient CLI not found. Please install it first."
    echo "   curl -sSL https://cli.do-ai.run/install.sh | sh"
    exit 1
fi

# Check for required environment variables
if [ -z "$DIGITALOCEAN_API_TOKEN" ]; then
    echo "❌ DIGITALOCEAN_API_TOKEN not set"
    exit 1
fi

echo "📊 Dataset: evaluations/test_dataset.csv"
echo "📁 Results: $RESULTS_FILE"
echo ""

# Run evaluation with correct Gradient CLI syntax
gradient agent evaluate \
  --test-case-name "OptiRoute Support Agent Baseline" \
  --dataset-file evaluations/test_dataset.csv \
  --categories "correctness,user_outcomes,safety_and_security" \
  --success-threshold 80.0 \
  --no-interactive

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Evaluation completed successfully"
    
    # Note: Results are typically shown in console, not saved to JSON by default
    # Check if there are any result files
    if ls evaluations/results/*.json 1> /dev/null 2>&1; then
        LATEST_RESULT=$(ls -t evaluations/results/*.json | head -1)
        echo "📊 Latest result: $LATEST_RESULT"
        
        # Display summary if jq is available
        if command -v jq &> /dev/null; then
            echo ""
            echo "📈 Summary:"
            jq '.' "$LATEST_RESULT" 2>/dev/null || echo "Results displayed above"
        fi
    else
        echo "📊 Results displayed above (not saved to JSON)"
    fi
else
    echo ""
    echo "❌ Evaluation failed"
    exit 1
fi
