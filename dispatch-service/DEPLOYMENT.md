# Dispatch Service Deployment Guide

## Overview

The OptiRoute Dispatch Service is deployed as a second service component in the existing DigitalOcean App Platform app. It shares the Supabase database with the main OptiRoute application.

## Prerequisites

Before deploying the dispatch service, you need to configure the following external service credentials:

### 1. Telegram Bot Token

The dispatch service uses the Telegram Bot API to send route assignments to drivers via Telegram.

**Setup Steps:**

1. Create a Telegram bot using [@BotFather](https://t.me/botfather)
2. Send `/newbot` to BotFather and follow the prompts
3. Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Add the token to DigitalOcean App Platform:
   - Navigate to your app in the DigitalOcean dashboard
   - Go to Settings → dispatch service → Environment Variables
   - Add `TELEGRAM_BOT_TOKEN` as a SECRET with your bot token

**Driver Configuration:**

Each driver who wants to receive Telegram notifications must:
1. Start a conversation with your bot
2. Send any message to the bot
3. Get their chat ID (you can use a bot like [@userinfobot](https://t.me/userinfobot))
4. Add the chat ID to their driver record in the `drivers` table (`telegram_chat_id` column)

### 2. Email API Key

The dispatch service supports two email providers: SendGrid and Resend.

#### Option A: SendGrid

1. Sign up for a SendGrid account at https://sendgrid.com
2. Create an API key with "Mail Send" permissions
3. Verify your sender email address or domain
4. Add to DigitalOcean App Platform:
   - `EMAIL_PROVIDER` = `sendgrid`
   - `EMAIL_API_KEY` = your SendGrid API key (as SECRET)
   - `EMAIL_FROM_ADDRESS` = your verified sender email

#### Option B: Resend

1. Sign up for a Resend account at https://resend.com
2. Create an API key
3. Verify your sender domain
4. Add to DigitalOcean App Platform:
   - `EMAIL_PROVIDER` = `resend`
   - `EMAIL_API_KEY` = your Resend API key (as SECRET)
   - `EMAIL_FROM_ADDRESS` = your verified sender email

**Driver Configuration:**

Ensure each driver has a valid email address in the `drivers` table (`email` column).

### 3. API Authentication Keys

The dispatch service requires API keys for authentication. These keys are used by the main OptiRoute app to call the dispatch service.

**Setup Steps:**

1. Generate one or more secure API keys (recommended: 32+ character random strings)
2. Add to DigitalOcean App Platform:
   - `DISPATCH_API_KEYS` = comma-separated list of keys (as SECRET)
   - Example: `key1-abc123xyz,key2-def456uvw`

3. Configure the main OptiRoute app to use one of these keys when calling the dispatch service

## Database Migrations

The dispatch service requires the following database migrations to be applied:

1. **Dispatch Tables** (`20260116000000_create_dispatch_tables.sql`)
   - Creates `dispatches` table
   - Creates `channel_dispatches` table
   - Adds indexes for efficient querying

2. **Driver Preferences** (`20260116000001_add_driver_dispatch_preferences.sql`)
   - Adds `preferred_channel` column to `drivers` table
   - Adds `fallback_enabled` column to `drivers` table

These migrations should already be in the `supabase/migrations` directory and will be applied automatically when you run migrations.

## Deployment

The dispatch service is configured in `do-app-spec.yaml` and will be deployed automatically when you push to the main branch.

### Deployment Configuration

- **Service Name:** dispatch
- **Port:** 3001
- **Instance Size:** apps-s-1vcpu-0.5gb
- **Instance Count:** 1
- **Health Check:** `/api/v1/health`

### Environment Variables

The following environment variables are configured in `do-app-spec.yaml`:

**Shared with Main App:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `SUPABASE_SCHEMA` - Database schema name (fleetillo)

**Dispatch Service Specific:**
- `PORT` - Service port (3001)
- `DISPATCH_API_KEYS` - API authentication keys (SECRET)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (SECRET)
- `EMAIL_PROVIDER` - Email provider (sendgrid or resend)
- `EMAIL_API_KEY` - Email provider API key (SECRET)
- `EMAIL_FROM_ADDRESS` - Sender email address
- `NODE_ENV` - Node environment (production)

## Local Development

For local development, you can run the dispatch service without real external service credentials by using mock adapters.

### Setup

1. Copy `.env.example` to `.env` in the `dispatch-service` directory
2. Configure environment variables:

```bash
# Supabase (same as main app)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_SCHEMA=fleetillo

# Service configuration
PORT=3001
NODE_ENV=development

# API Keys (for testing)
DISPATCH_API_KEYS=test-key-1,test-key-2

# Optional: Real credentials for testing
# TELEGRAM_BOT_TOKEN=your_bot_token
# EMAIL_PROVIDER=sendgrid
# EMAIL_API_KEY=your_email_key
# EMAIL_FROM_ADDRESS=test@example.com
```

3. Run the service:

```bash
cd dispatch-service
npm install
npm run dev
```

### Testing Without Real Credentials

The test suite includes mock adapters that simulate Telegram and Email providers. You can run all tests without configuring real credentials:

```bash
npm test
```

## Verification

After deployment, verify the service is running:

1. **Health Check:**
   ```bash
   curl https://your-app-url/api/v1/health
   ```
   
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-01-16T...",
     "checks": {
       "database": { "status": "up", "latencyMs": 50 },
       "telegram": { "status": "up" },
       "email": { "status": "up" }
     }
   }
   ```

2. **Test Dispatch:**
   ```bash
   curl -X POST https://your-app-url/api/v1/dispatch \
     -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "route_id": "route-uuid",
       "driver_id": "driver-uuid"
     }'
   ```
   
   Expected response:
   ```json
   {
     "dispatch_id": "uuid",
     "status": "pending",
     "requested_channels": ["telegram"]
   }
   ```

## Troubleshooting

### Service Won't Start

- Check the DigitalOcean logs for error messages
- Verify all required environment variables are set
- Ensure the database migrations have been applied

### Telegram Messages Not Sending

- Verify `TELEGRAM_BOT_TOKEN` is set correctly
- Check that drivers have valid `telegram_chat_id` values
- Ensure drivers have started a conversation with your bot
- Check the dispatch service logs for Telegram API errors

### Email Messages Not Sending

- Verify `EMAIL_API_KEY` is set correctly
- Check that `EMAIL_FROM_ADDRESS` is verified with your provider
- Ensure drivers have valid email addresses
- Check the dispatch service logs for email provider errors

### Authentication Errors

- Verify `DISPATCH_API_KEYS` is set in the dispatch service
- Ensure the main app is using a valid API key from the list
- Check that the `X-API-Key` header is being sent with requests

## Monitoring

Monitor the dispatch service using:

1. **DigitalOcean Metrics:**
   - CPU usage
   - Memory usage
   - Request rate
   - Error rate

2. **Application Logs:**
   - View logs in the DigitalOcean dashboard
   - Filter by service: dispatch
   - Look for ERROR and WARN level messages

3. **Database Queries:**
   - Query the `dispatches` table to see dispatch history
   - Query the `channel_dispatches` table to see delivery status
   - Monitor for failed dispatches and investigate errors

## Support

For issues or questions:
- Check the logs in DigitalOcean dashboard
- Review the error messages in the `channel_dispatches` table
- Consult the API documentation in the main README
