# Dispatch Service

The Fleetillo Dispatch Service handles driver notifications via Telegram and Email, including driver registration and route dispatch.

## Quick Start

1. Copy `.env.example` to `.env`
2. Configure environment variables (see below)
3. Build and run:
   ```bash
   npm install
   npm run build
   npm run dev
   ```

## Deployment Modes

### Embedded Mode (Recommended)

The dispatch service runs embedded within the web-launcher, sharing the same process and session authentication. This is the default for production.

**Configuration in web-launcher/.env:**
```bash
DISPATCH_MODE=embedded
DISPATCH_API_KEYS=your-32-character-minimum-api-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret-token
RESEND_API_KEY=your-resend-api-key
EMAIL_PROVIDER=resend
EMAIL_FROM_ADDRESS=dispatch@yourdomain.com
EMAIL_FROM_NAME="Fleetillo Dispatch"
CORS_ORIGIN=https://your-app-domain.com
```

**Routes are mounted at:** `/dispatch/api/v1/...`

### Standalone Mode

The dispatch service runs as a separate process. Used for development or when deploying services separately.

**Configuration in dispatch-service/.env:**
```bash
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SCHEMA=fleetillo
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DISPATCH_API_KEYS=your-32-character-minimum-api-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret-token
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM_ADDRESS=dispatch@yourdomain.com
EMAIL_FROM_NAME=Fleetillo Dispatch
CORS_ORIGIN=https://your-app-domain.com
APP_BASE_URL=https://your-main-app-domain.com
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Token from [@BotFather](https://t.me/botfather) |
| `TELEGRAM_WEBHOOK_SECRET` | Production | Secret token for webhook authentication (see Security section) |
| `EMAIL_PROVIDER` | Yes | `resend` or `sendgrid` |
| `RESEND_API_KEY` | If using Resend | API key from [Resend](https://resend.com) |
| `SENDGRID_API_KEY` | If using SendGrid | API key from [SendGrid](https://sendgrid.com) |
| `EMAIL_FROM_ADDRESS` | Yes | Verified sender email address |
| `EMAIL_FROM_NAME` | No | Display name for emails (default: "Fleetillo Dispatch") |
| `DISPATCH_API_KEYS` | Yes | Comma-separated API keys (**minimum 32 characters each**) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (required to bypass RLS) |
| `CORS_ORIGIN` | Production | Comma-separated allowed origins (e.g., `https://app.example.com,https://admin.example.com`) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 60000) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |

## Telegram Webhook Configuration (CRITICAL)

The Telegram bot requires a webhook to receive messages (like `/start` commands from driver registration). **This must be configured after deployment.**

### Automated Setup (Recommended)

Use the included setup script to register the webhook with Telegram:

**Step 1: Configure your `.env` file**
```bash
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_WEBHOOK_SECRET=your-64-character-hex-secret
WEBHOOK_URL=https://your-domain.com/dispatch/api/v1/telegram/webhook
```

To generate a secret token:
```bash
openssl rand -hex 32
```

**Step 2: Run the setup script**
```bash
npm run setup:webhook
```

The script will:
- Load configuration from your `.env` file
- Register the webhook URL with Telegram
- Configure the secret token for authentication
- Verify the registration was successful

**Alternative: Pass arguments directly**
```bash
./scripts/setup-telegram-webhook.sh <bot_token> <webhook_url> <webhook_secret>
```

### Manual Setup (Alternative)

If you prefer to set up the webhook manually:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -F "url=YOUR_APP_URL/dispatch/api/v1/telegram/webhook" \
  -F "secret_token=YOUR_WEBHOOK_SECRET"
```

### Development Mode (No Secret)

For local development, you can omit the secret token:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=YOUR_APP_URL/dispatch/api/v1/telegram/webhook"
```

**Example:**
```bash
curl "https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://fleetillo-web-tulrl.ondigitalocean.app/dispatch/api/v1/telegram/webhook"
```

**Note:** If `TELEGRAM_WEBHOOK_SECRET` is not set, the service will log a warning but allow requests through. This is acceptable for development but not recommended for production.

### Verifying the Webhook

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo" | jq .
```

**Expected response:**
```json
{
  "ok": true,
  "result": {
    "url": "https://your-app.ondigitalocean.app/dispatch/api/v1/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

### Common Webhook Issues

| Issue | Solution |
|-------|----------|
| `url` is empty | Webhook not set. Run `npm run setup:webhook` |
| `last_error_message: "401 Unauthorized"` | Secret mismatch. Ensure `TELEGRAM_WEBHOOK_SECRET` in your environment matches what was registered with Telegram. Re-run `npm run setup:webhook` |
| `last_error_message: "404 Not Found"` | Wrong URL or dispatch service not running |
| `last_error_message: "Failed to resolve host"` | Domain DNS not configured |
| `pending_update_count` increasing | Webhook endpoint not responding correctly |

## Email Provider Setup

### Resend (Recommended)

1. Create account at [resend.com](https://resend.com)
2. Add and verify your sending domain
3. Create an API key
4. Set environment variables:
   ```bash
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxx
   EMAIL_FROM_ADDRESS=dispatch@your-verified-domain.com
   ```

**Domain Verification Required:** The `EMAIL_FROM_ADDRESS` domain must be verified in Resend. Using an unverified domain results in "domain is not verified" errors.

### SendGrid

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Verify your sender identity (email or domain)
3. Create an API key with "Mail Send" permission
4. Set environment variables:
   ```bash
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.xxxxx
   EMAIL_FROM_ADDRESS=dispatch@your-verified-domain.com
   ```

## API Endpoints

### Health Check
```bash
GET /dispatch/api/v1/health
```

### Driver Registration (Telegram)

**Get Registration Link:**
```bash
GET /dispatch/api/v1/telegram/registration/:driverId
```

**Send Registration Email:**
```bash
POST /dispatch/api/v1/telegram/send-registration
Content-Type: application/json
{"driverId": "uuid"}
```

**Telegram Webhook (receives /start commands):**
```bash
POST /dispatch/api/v1/telegram/webhook
```

### Dispatch Route to Driver
```bash
POST /dispatch/api/v1/dispatch
X-API-Key: your-api-key
Content-Type: application/json
{"route_id": "uuid", "driver_id": "uuid"}
```

## Driver Registration Flow

1. **Admin opens driver edit modal** and clicks "Send Link"
2. **Email is sent** with QR code containing a Telegram deep link
3. **Driver scans QR code** which opens Telegram with the bot
4. **Driver sends /start** (or clicks the link which auto-sends it)
5. **Webhook receives the message** and links the Telegram chat to the driver
6. **Driver is now registered** and can receive dispatch notifications

## Troubleshooting

### Registration Email Fails

1. Check server logs for detailed error messages
2. Verify `EMAIL_PROVIDER` and API key are set
3. Confirm `EMAIL_FROM_ADDRESS` domain is verified with provider
4. Test the health endpoint: `GET /dispatch/api/v1/health`

### QR Code / Registration Link Fails

1. Verify `TELEGRAM_BOT_TOKEN` is correct
2. Test bot token: `curl "https://api.telegram.org/botYOUR_TOKEN/getMe"`
3. Check server logs for authentication errors

### Driver Sends /start but Doesn't Get Connected

1. **Most common:** Webhook URL not set (see Telegram Webhook Configuration above)
2. Check `getWebhookInfo` for errors
3. Verify the app URL is correct (use DigitalOcean app URL, not custom domain if DNS not configured)
4. Check server logs for incoming webhook requests

### Health Check Shows "unhealthy"

```bash
curl /dispatch/api/v1/health | jq .
```

Check individual component status:
- `database: unhealthy` - Check Supabase credentials
- `telegram: unhealthy` - Check bot token is valid
- `email: unhealthy` - Check email provider API key

## Startup Validation

In **standalone mode**, the service validates required environment variables at startup and fails fast with clear error messages if any are missing:

```
============================================================
ENVIRONMENT VALIDATION FAILED
============================================================

The following required environment variables are missing or invalid:

  ❌ Missing required environment variable: DISPATCH_API_KEYS
  ❌ DISPATCH_API_KEYS contains 1 key(s) shorter than 32 characters.

Please set these variables in your .env file or environment.
See README.md for configuration details.
============================================================
```

### Required Variables (all modes)
- `SUPABASE_URL`
- `DISPATCH_API_KEYS` (each key must be 32+ characters)
- `TELEGRAM_BOT_TOKEN`

### Required in Production
- `SUPABASE_SERVICE_ROLE_KEY`

### Recommended in Production (warnings)
- `TELEGRAM_WEBHOOK_SECRET` - Webhook requests will not be authenticated
- `CORS_ORIGIN` - CORS will block all cross-origin requests

## Development

### Build
```bash
npm run build
```

### Run (Development)
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Type Check
```bash
npm run typecheck
```

## Security Configuration

The dispatch service includes multiple security layers. All are enabled by default in production.

### Security by Deployment Mode

| Security Feature | Standalone | Embedded |
|------------------|------------|----------|
| Rate limiting | ✅ | ✅ |
| API key auth (32-char, timing-safe) | ✅ | ✅ |
| Telegram webhook auth | ✅ | ✅ |
| Zod request validation | ✅ | ✅ |
| Helmet security headers | ✅ | ❌ * |
| Hardened CORS | ✅ | ❌ * |

\* In embedded mode, Helmet and CORS are the responsibility of the parent application (web-launcher).

### API Key Authentication

All protected endpoints require the `X-API-Key` header.

**Requirements:**
- API keys must be **at least 32 characters** long
- Keys shorter than 32 characters are rejected
- Multiple keys can be configured (comma-separated)
- Uses timing-safe comparison to prevent timing attacks

```bash
# Example: Generate a secure API key
openssl rand -base64 32
```

### Rate Limiting

Three tiers of rate limiting are applied:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 1 minute |
| Dispatch endpoints | 50 requests | 1 minute |
| Telegram webhook | 10 requests | 1 second |

**Configuration:**
```bash
RATE_LIMIT_WINDOW_MS=60000      # Window in milliseconds (default: 60000)
RATE_LIMIT_MAX_REQUESTS=100     # Max requests per window (default: 100)
```

Rate limit responses return HTTP 429 with headers:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in window
- `RateLimit-Reset`: Time when the limit resets

### Telegram Webhook Authentication

Webhook requests from Telegram are authenticated using a secret token.

**Setup:**
1. Generate a secret: `openssl rand -hex 32`
2. Register webhook with Telegram including the `secret_token` parameter
3. Set `TELEGRAM_WEBHOOK_SECRET` in your environment

Telegram sends this token in the `X-Telegram-Bot-Api-Secret-Token` header with each request.

**Note:** If `TELEGRAM_WEBHOOK_SECRET` is not configured, webhook authentication is skipped (development only - logs a warning).

### CORS Configuration

Cross-Origin Resource Sharing is configured via the `CORS_ORIGIN` environment variable.

```bash
# Single origin
CORS_ORIGIN=https://app.example.com

# Multiple origins (comma-separated)
CORS_ORIGIN=https://app.example.com,https://admin.example.com
```

If not set, CORS is disabled (no cross-origin requests allowed).

### Security Headers (Helmet)

The service uses [Helmet](https://helmetjs.github.io/) to set secure HTTP headers:

- Content Security Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)
- X-XSS-Protection

### Request Validation

All request bodies are validated using [Zod](https://zod.dev/) schemas:

- Type checking for all fields
- UUID format validation for IDs
- Enum validation for channel types
- Array bounds checking for batch requests

Invalid requests return HTTP 400 with detailed field-level error messages.

## Related Documentation

- [API Reference](./API.md) - Full API documentation
- [Deployment Guide](./DEPLOYMENT.md) - DigitalOcean deployment details
