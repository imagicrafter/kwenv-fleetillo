#!/bin/bash
#
# Setup Telegram Webhook with Secret Token
#
# This script registers the Telegram webhook URL with a secret token for authentication.
# Run this after deploying to a new environment or when updating the webhook secret.
#
# Usage:
#   ./scripts/setup-telegram-webhook.sh
#
# Required environment variables:
#   TELEGRAM_BOT_TOKEN       - Your Telegram bot token from BotFather
#   TELEGRAM_WEBHOOK_SECRET  - Secret token for webhook authentication (min 32 chars recommended)
#   WEBHOOK_URL              - Full webhook URL (e.g., https://example.com/dispatch/api/v1/telegram/webhook)
#
# Or pass as arguments:
#   ./scripts/setup-telegram-webhook.sh <bot_token> <webhook_url> <webhook_secret>
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  Telegram Webhook Setup"
echo "=========================================="
echo ""

# Get values from arguments or environment
BOT_TOKEN="${1:-$TELEGRAM_BOT_TOKEN}"
WEBHOOK_URL="${2:-$WEBHOOK_URL}"
WEBHOOK_SECRET="${3:-$TELEGRAM_WEBHOOK_SECRET}"

# Validate required values
if [ -z "$BOT_TOKEN" ]; then
    echo -e "${RED}ERROR: TELEGRAM_BOT_TOKEN is required${NC}"
    echo "Set it as an environment variable or pass as first argument"
    exit 1
fi

if [ -z "$WEBHOOK_URL" ]; then
    echo -e "${RED}ERROR: WEBHOOK_URL is required${NC}"
    echo "Set it as an environment variable or pass as second argument"
    echo "Example: https://your-domain.com/dispatch/api/v1/telegram/webhook"
    exit 1
fi

if [ -z "$WEBHOOK_SECRET" ]; then
    echo -e "${YELLOW}WARNING: TELEGRAM_WEBHOOK_SECRET is not set${NC}"
    echo "Webhook will be registered WITHOUT authentication."
    echo ""
    read -p "Continue without secret? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo ""
        echo "To generate a secret:"
        echo "  openssl rand -hex 32"
        echo ""
        exit 1
    fi
fi

# Mask sensitive values for display
MASKED_TOKEN="${BOT_TOKEN:0:10}..."
MASKED_SECRET="${WEBHOOK_SECRET:0:8}..."

echo "Configuration:"
echo "  Bot Token:      $MASKED_TOKEN"
echo "  Webhook URL:    $WEBHOOK_URL"
echo "  Secret Token:   ${WEBHOOK_SECRET:+$MASKED_SECRET}${WEBHOOK_SECRET:-NOT SET}"
echo ""

# Build the API URL
API_URL="https://api.telegram.org/bot${BOT_TOKEN}/setWebhook"

# Build request data
if [ -n "$WEBHOOK_SECRET" ]; then
    REQUEST_DATA="url=${WEBHOOK_URL}&secret_token=${WEBHOOK_SECRET}"
else
    REQUEST_DATA="url=${WEBHOOK_URL}"
fi

echo "Registering webhook..."
echo ""

# Make the API call
RESPONSE=$(curl -s -X POST "$API_URL" -d "$REQUEST_DATA")

# Check if successful
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Webhook registered successfully!${NC}"
else
    echo -e "${RED}❌ Failed to register webhook${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "Verifying webhook..."
echo ""

# Get webhook info
INFO_RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")

# Parse and display info
CURRENT_URL=$(echo "$INFO_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
PENDING_COUNT=$(echo "$INFO_RESPONSE" | grep -o '"pending_update_count":[0-9]*' | cut -d':' -f2)
LAST_ERROR=$(echo "$INFO_RESPONSE" | grep -o '"last_error_message":"[^"]*"' | cut -d'"' -f4)

echo "Webhook Info:"
echo "  URL:              $CURRENT_URL"
echo "  Pending Updates:  ${PENDING_COUNT:-0}"
if [ -n "$LAST_ERROR" ]; then
    echo -e "  Last Error:       ${RED}$LAST_ERROR${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  Setup Complete!"
echo "==========================================${NC}"
echo ""
if [ -n "$WEBHOOK_SECRET" ]; then
    echo "Telegram will now send the secret token in the"
    echo "X-Telegram-Bot-Api-Secret-Token header with each request."
else
    echo -e "${YELLOW}WARNING: Webhook is NOT authenticated!${NC}"
    echo "Anyone who knows the URL can send fake requests."
fi
echo ""
