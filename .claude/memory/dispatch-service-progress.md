# Dispatch Service Implementation Progress

**Last Updated:** 2026-01-17
**Branch:** `feature/dispatch-service`
**Status:** Deployment in progress (embedded mode)

## Overview

Implemented a dispatch service for sending route assignments to drivers via Telegram and Email. The service supports flexible deployment modes for different environments.

## What Was Built

### 1. Dispatch Service (`dispatch-service/`)

A standalone microservice with:

- **REST API** for dispatching routes to drivers
  - `POST /api/v1/dispatch` - Send single dispatch
  - `POST /api/v1/dispatch/batch` - Send batch dispatches
  - `GET /api/v1/dispatch/:id` - Get dispatch status
  - `GET /api/v1/health` - Health check

- **Telegram Integration**
  - `POST /api/v1/telegram/webhook` - Receives /start commands for driver registration
  - `GET /api/v1/telegram/registration/:driverId` - Generates registration link + QR code
  - `POST /api/v1/telegram/send-registration` - Emails registration link to driver

- **Email Integration** (Resend)
  - Registration emails with QR codes
  - Dispatch notifications

- **Core Components:**
  - `src/adapters/telegram.ts` - Telegram Bot API integration
  - `src/adapters/email.ts` - Resend/SendGrid email integration
  - `src/core/orchestrator.ts` - Dispatch coordination
  - `src/api/handlers/telegram.ts` - Webhook and registration handlers
  - `src/db/entities.repository.ts` - Database access

### 2. Flexible Deployment Architecture (`deploy/`)

```
deploy/
├── config.yaml                  # Deployment settings
├── do-app-spec.embedded.yaml    # Single service (demos)
├── do-app-spec.standalone.yaml  # Two services (production)
└── deploy.sh                    # Unified deployment script
```

**Deployment Modes:**
- `embedded` - Dispatch runs inside web-launcher (single service, lower cost)
- `standalone` - Dispatch runs as separate service (scalable, higher cost)

**Usage:**
```bash
./deploy/deploy.sh embedded     # Deploy single service
./deploy/deploy.sh standalone   # Deploy two services
./deploy/deploy.sh --dry-run    # Preview without deploying
```

### 3. Web-Launcher Integration

- `web-launcher/dispatch-integration.js` - Bridges dispatch into web-launcher
- `web-launcher/server.js` - Modified to conditionally mount dispatch routes when `DISPATCH_MODE=embedded`

### 4. Database Migrations

- `supabase/migrations/20260116000000_create_dispatch_tables.sql` - Dispatches and channel_dispatches tables
- `supabase/migrations/20260116000001_add_driver_dispatch_preferences.sql` - Driver preferences columns

## Configuration

### Environment Variables (dispatch-service/.env)

```env
# Supabase
SUPABASE_URL=https://vtaufnxworztolfdwlll.supabase.co
SUPABASE_KEY=***REMOVED_SUPABASE_SECRET***
SUPABASE_SCHEMA=routeiq

# API Authentication
DISPATCH_API_KEYS=ylF7ge7+HVIvj56XtFDnTiGe8l5HkAbGSqghOkypICs=

# Telegram
TELEGRAM_BOT_TOKEN=8506993061:AAEGs5_8JhIxDxskVAwHTgdCn2H8MM206_M

# Email (Resend)
EMAIL_PROVIDER=resend
RESEND_API_KEY=<user's key - full access required>
EMAIL_FROM_ADDRESS=dispatch@optiroute.imagicrafterai.com
```

### Telegram Bot

- **Bot Username:** `@route_dispatch_bot`
- **Bot Name:** Route Dispatcher
- **Created via:** BotFather

## Driver Registration Flow

1. Admin adds driver in OptiRoute with their email
2. Admin calls `POST /dispatch/api/v1/telegram/send-registration` with driver ID
3. Driver receives email with QR code and link
4. Driver clicks link → Telegram opens → taps "Start"
5. Webhook receives message → auto-updates driver's `telegram_chat_id`
6. Driver receives welcome confirmation
7. Done! Driver now receives dispatch notifications

## Current Deployment Status

- **Digital Ocean App ID:** `f7b5791e-3ddf-4b13-9fbf-30665a117025`
- **Mode:** Embedded (single service)
- **Branch:** `feature/dispatch-service`
- **Status:** Building

### Secrets to Set in DO Dashboard

| Variable | Description |
|----------|-------------|
| `DISPATCH_API_KEYS` | API key for dispatch service authentication |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather |
| `RESEND_API_KEY` | Resend API key (full access) |

## Remaining Tasks

1. **Set secrets in Digital Ocean dashboard** - Required for deployment to work
2. **Set up Telegram webhook** - After deployment, register webhook URL with Telegram
3. **Test end-to-end flow** - Driver registration and dispatch
4. **Update UI** - Add dispatch buttons to routes page

## API Endpoints After Deployment

**Base URL:** `https://optiroute.imagicrafterai.com/dispatch`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/health` | GET | None | Health check |
| `/api/v1/dispatch` | POST | API Key | Send dispatch |
| `/api/v1/dispatch/batch` | POST | API Key | Batch dispatch |
| `/api/v1/dispatch/:id` | GET | API Key | Get status |
| `/api/v1/telegram/webhook` | POST | None | Telegram updates |
| `/api/v1/telegram/registration/:driverId` | GET | API Key | Get registration link |
| `/api/v1/telegram/send-registration` | POST | API Key | Email registration |

## Key Files

```
dispatch-service/
├── src/
│   ├── index.ts                 # Entry point
│   ├── api/
│   │   ├── routes.ts            # Route definitions
│   │   └── handlers/
│   │       ├── dispatch.ts      # Dispatch handlers
│   │       ├── health.ts        # Health check
│   │       └── telegram.ts      # Telegram webhook + registration
│   ├── adapters/
│   │   ├── telegram.ts          # Telegram Bot API
│   │   └── email.ts             # Resend/SendGrid
│   ├── core/
│   │   ├── orchestrator.ts      # Dispatch coordination
│   │   └── templates.ts         # Message templates
│   └── db/
│       ├── supabase.ts          # DB client
│       ├── dispatch.repository.ts
│       └── entities.repository.ts
├── .env                         # Local config (gitignored)
├── .env.example                 # Template
└── API.md                       # API documentation

deploy/
├── config.yaml                  # Deployment config
├── do-app-spec.embedded.yaml    # Single service spec
├── do-app-spec.standalone.yaml  # Two service spec
└── deploy.sh                    # Deployment script

web-launcher/
├── server.js                    # Modified for dispatch integration
└── dispatch-integration.js      # Bridges dispatch service
```

## Testing Locally

```bash
# Start dispatch service standalone
cd dispatch-service
npm run build
npm start
# Available at http://localhost:3001

# Test health
curl http://localhost:3001/api/v1/health

# Or test embedded mode
cd web-launcher
DISPATCH_MODE=embedded npm start
# Dispatch at http://localhost:8080/dispatch/api/v1/health
```

## Notes

- Telegram bots cannot send messages by phone number - users must first message the bot
- Driver registration requires the driver to click a link or scan QR code
- Resend API key needs "Full access" for health check to work (checks /domains endpoint)
- The `do-app-spec.yaml` in root is outdated - use files in `deploy/` directory
