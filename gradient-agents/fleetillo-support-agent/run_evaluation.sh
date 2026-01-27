#!/bin/bash
# Run pytest evaluation with environment loaded from .env

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "📋 Loading environment from .env..."
    set -a  # automatically export all variables
    source .env
    set +a
fi

# Activate virtual environment
source .venv/bin/activate

# Run pytest with all environment variables
pytest evaluations/test_gradient_evaluation.py -v -s "$@"
