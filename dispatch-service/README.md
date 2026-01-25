# Dispatch Service

The OptiRoute Dispatch Service handles driver notifications via Telegram and Email, including driver registration and route dispatch.

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
DISPATCH_API_KEYS=your-api-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
RESEND_API_KEY=your-resend-api-key
EMAIL_PROVIDER=resend
EMAIL_FROM_ADDRESS=dispatch@yourdomain.com
EMAIL_FROM_NAME="OptiRoute Dispatch"
```

**Routes are mounted at:** `/dispatch/api/v1/...`

### Standalone Mode

The dispatch service runs as a separate process. Used for development or when deploying services separately.

**Configuration in dispatch-service/.env:**
```bash
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DISPATCH_API_KEYS=your-api-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM_ADDRESS=dispatch@yourdomain.com
EMAIL_FROM_NAME=OptiRoute Dispatch
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Token from [@BotFather](https://t.me/botfather) |
| `EMAIL_PROVIDER` | Yes | `resend` or `sendgrid` |
| `RESEND_API_KEY` | If using Resend | API key from [Resend](https://resend.com) |
| `SENDGRID_API_KEY` | If using SendGrid | API key from [SendGrid](https://sendgrid.com) |
| `EMAIL_FROM_ADDRESS` | Yes | Verified sender email address |
| `EMAIL_FROM_NAME` | No | Display name for emails (default: "OptiRoute Dispatch") |
| `DISPATCH_API_KEYS` | Yes | Comma-separated API keys for authentication |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |

## Telegram Webhook Configuration (CRITICAL)

The Telegram bot requires a webhook to receive messages (like `/start` commands from driver registration). **This must be configured after deployment.**

### Setting the Webhook

Replace `YOUR_BOT_TOKEN` and `YOUR_APP_URL` with your values:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=YOUR_APP_URL/dispatch/api/v1/telegram/webhook"
```

**Example:**
```bash
curl "https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://optiroute-web-tulrl.ondigitalocean.app/dispatch/api/v1/telegram/webhook"
```

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
| `url` is empty | Webhook not set. Run the setWebhook command. |
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

## Related Documentation

- [API Reference](./API.md) - Full API documentation
- [Deployment Guide](./DEPLOYMENT.md) - DigitalOcean deployment details
