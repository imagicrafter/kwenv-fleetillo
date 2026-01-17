#!/bin/bash
#
# OptiRoute Deployment Script
#
# Deploys the application based on configuration in deploy/config.yaml
#
# Usage:
#   ./deploy/deploy.sh              # Deploy using config.yaml settings
#   ./deploy/deploy.sh embedded     # Force embedded mode
#   ./deploy/deploy.sh standalone   # Force standalone mode
#   ./deploy/deploy.sh --dry-run    # Show what would be deployed
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
CONFIG_FILE="$SCRIPT_DIR/config.yaml"
DRY_RUN=false

# Parse arguments
MODE=""
for arg in "$@"; do
  case $arg in
    embedded|standalone)
      MODE="$arg"
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --help|-h)
      echo "OptiRoute Deployment Script"
      echo ""
      echo "Usage: ./deploy/deploy.sh [MODE] [OPTIONS]"
      echo ""
      echo "Modes:"
      echo "  embedded    Deploy as single service (dispatch in web-launcher)"
      echo "  standalone  Deploy as two services (separate dispatch service)"
      echo ""
      echo "Options:"
      echo "  --dry-run   Show what would be deployed without deploying"
      echo "  --help      Show this help message"
      echo ""
      echo "If no mode is specified, uses the mode from deploy/config.yaml"
      exit 0
      ;;
  esac
done

# Read config if mode not specified
if [ -z "$MODE" ]; then
  if [ -f "$CONFIG_FILE" ]; then
    # Simple YAML parsing for mode
    MODE=$(grep "^mode:" "$CONFIG_FILE" | awk '{print $2}')
  fi
  # Default to embedded if still not set
  MODE=${MODE:-embedded}
fi

# Read app ID from config
APP_ID=$(grep "app_id:" "$CONFIG_FILE" 2>/dev/null | awk '{print $2}')
if [ -z "$APP_ID" ]; then
  echo -e "${RED}Error: app_id not found in config.yaml${NC}"
  exit 1
fi

# Determine which spec to use
if [ "$MODE" = "standalone" ]; then
  SPEC_FILE="$SCRIPT_DIR/do-app-spec.standalone.yaml"
  echo -e "${BLUE}Deployment Mode: STANDALONE${NC}"
  echo "  - Web application service"
  echo "  - Separate dispatch service (scalable)"
else
  SPEC_FILE="$SCRIPT_DIR/do-app-spec.embedded.yaml"
  echo -e "${BLUE}Deployment Mode: EMBEDDED${NC}"
  echo "  - Single service with dispatch built-in"
  echo "  - Lower cost, simpler architecture"
fi

echo ""
echo -e "App ID: ${GREEN}$APP_ID${NC}"
echo -e "Spec File: ${GREEN}$SPEC_FILE${NC}"
echo ""

# Check if spec file exists
if [ ! -f "$SPEC_FILE" ]; then
  echo -e "${RED}Error: Spec file not found: $SPEC_FILE${NC}"
  exit 1
fi

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
  echo -e "${RED}Error: doctl is not installed${NC}"
  echo "Install it with: brew install doctl"
  exit 1
fi

# Check if authenticated
if ! doctl account get &> /dev/null; then
  echo -e "${RED}Error: doctl is not authenticated${NC}"
  echo "Run: doctl auth init"
  exit 1
fi

# Dry run - just show what would happen
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY RUN - No changes will be made${NC}"
  echo ""
  echo "Would run:"
  echo "  doctl apps update $APP_ID --spec $SPEC_FILE"
  echo ""
  echo "Spec contents:"
  echo "---"
  cat "$SPEC_FILE"
  exit 0
fi

# Confirm deployment
echo -e "${YELLOW}Ready to deploy. Continue? (y/N)${NC}"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 0
fi

# Deploy
echo ""
echo -e "${BLUE}Deploying...${NC}"
doctl apps update "$APP_ID" --spec "$SPEC_FILE"

echo ""
echo -e "${GREEN}Deployment initiated!${NC}"
echo ""
echo "Monitor deployment status:"
echo "  doctl apps list-deployments $APP_ID"
echo ""
echo "Or visit the Digital Ocean dashboard:"
echo "  https://cloud.digitalocean.com/apps/$APP_ID"
echo ""

# Reminder about secrets
echo -e "${YELLOW}REMINDER: Set secrets in Digital Ocean dashboard:${NC}"
echo "  - DISPATCH_API_KEYS"
echo "  - TELEGRAM_BOT_TOKEN"
echo "  - RESEND_API_KEY"
