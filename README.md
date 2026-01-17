# OptiRoute

A route planning and management system for service-based businesses built with TypeScript, Electron, and Supabase.

## Overview

OptiRoute helps service-based businesses efficiently manage their daily operations by providing:

- **Customer Management** - Maintain a comprehensive client database with service addresses
- **Service Catalog** - Manage services with configurable average service times
- **Vehicle Fleet Management** - Track vehicles with service type tagging and maintenance schedules
- **Driver Management** - Manage drivers with license tracking and vehicle assignments
- **Booking Scheduler** - Schedule one-time and recurring service appointments
- **Route Optimization** - Generate optimized daily route plans using Google Routes API
- **Address Validation** - Validate and geocode addresses using Google Maps API
- **Dispatch Service** - Send route assignments to drivers via Telegram and Email

## Technology Stack

- **Runtime:** Node.js (>= 18.0.0)
- **Language:** TypeScript
- **Desktop App:** Electron
- **Web App:** Express.js
- **Database:** Supabase (PostgreSQL)
- **APIs:** Google Routes API, Google Maps API, Telegram Bot API, Resend Email API
- **Testing:** Playwright, Jest

## Prerequisites

- Node.js >= 18.0.0
- npm
- A Supabase account and project
- Google Cloud account with Maps API and Routes API enabled

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/imagicrafter/optiroute.git
   cd optiroute
   ```

2. **Install dependencies:**
   ```bash
   # Install main project dependencies
   npm install

   # Install Electron launcher dependencies
   cd electron-launcher
   npm install
   cd ..
   ```

3. **Build the TypeScript source:**
   ```bash
   npm run build
   ```

## Configuration

1. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure the required environment variables in `.env`:**

   ```env
   # Supabase Configuration (Required)
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   SUPABASE_SCHEMA=optiroute

   # Google Maps API Configuration (Required)
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here

   # Application Configuration
   NODE_ENV=development
   PORT=3000
   LOG_LEVEL=info
   DEBUG=false
   ```

   **Where to find these values:**
   - **Supabase URL & Keys:** Supabase Dashboard > Project Settings > API
   - **Google Maps API Key:** Google Cloud Console > APIs & Services > Credentials

## Database Setup

1. **Apply database migrations:**

   The Supabase migrations are located in `supabase/migrations/`. Apply them in order through the Supabase dashboard or CLI:

   ```bash
   # If using Supabase CLI
   supabase db push
   ```

   Alternatively, run the migrations manually through the Supabase SQL editor.

2. **Verify the database connection:**
   ```bash
   npm run db:check
   ```

## Running the Application
 
 ### Option 1: Electron Desktop App
 
 The Electron app provides a full desktop experience with direct database access.
 
 ```bash
 # Make sure you've built the TypeScript first
 npm run build
 
 # Start the Electron app
 cd electron-launcher && npm start
 ```
 
 ### Option 2: Web App
 
 Run the application in your browser via the web launcher.
 
 ```bash
 # Make sure you've built the TypeScript first
 npm run build
 
 # Start the Web Launcher
 cd web-launcher && npm start
 ```
 The web app will be available at `http://localhost:8080`.
 
 ### Option 3: Backend API Server
 
 Run the backend API server for headless API access or development:
 
 ```bash
 # Development mode (with hot reload)
 npm run dev
 
 # Production mode
 npm run build
 npm start
 ```
 The server will start on `http://localhost:3000`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:watch` | Watch mode for TypeScript compilation |
| `npm start` | Run the production server |
| `npm run dev` | Run development server with hot reload |
| `npm run db:check` | Verify database connection |
| `npm test` | Run Jest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run clean` | Remove build artifacts |

## Project Structure

```
optiroute/
├── electron-launcher/       # Electron desktop application
│   ├── src/
│   │   ├── main.js         # Electron main process
│   │   ├── preload.js      # Preload script for IPC
│   │   └── ui/             # HTML/CSS frontend files
│   └── package.json
├── web-launcher/            # Web application server
│   ├── server.js           # Express server with RPC API
│   ├── dispatch-integration.js  # Embedded dispatch service
│   └── public/             # Static frontend files
├── dispatch-service/        # Dispatch microservice
│   ├── src/
│   │   ├── api/            # REST API handlers
│   │   ├── adapters/       # Telegram & Email adapters
│   │   ├── core/           # Orchestrator & templates
│   │   └── db/             # Database repositories
│   ├── templates/          # Message templates
│   └── API.md              # API documentation
├── deploy/                  # Deployment configuration
│   ├── config.yaml         # Deployment settings
│   ├── do-app-spec.embedded.yaml   # Single service spec
│   ├── do-app-spec.standalone.yaml # Two service spec
│   └── deploy.sh           # Unified deployment script
├── src/
│   ├── controllers/        # Route controllers
│   ├── errors/             # Error handling utilities
│   ├── middleware/         # Express middleware
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic services
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── app.ts              # Express app configuration
│   └── server.ts           # Server entry point
├── supabase/
│   └── migrations/         # Database migration files
├── tests/
│   ├── e2e/                # Playwright E2E tests
│   ├── unit/               # Jest unit tests
│   └── fixtures/           # Test fixtures
├── docs/                   # Additional documentation
├── .env.example            # Environment template
├── package.json
├── tsconfig.json
└── playwright.config.ts
```

## API Endpoints

When running the Express server, the following API endpoints are available:

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET/POST /api/clients` | Client management |
| `GET/POST /api/services` | Service catalog |
| `GET/POST /api/vehicles` | Vehicle fleet |
| `GET/POST /api/bookings` | Booking management |
| `GET/POST /api/routes` | Route management |

## Testing

```bash
# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## Troubleshooting

### Electron app won't start
- Ensure you've run `npm run build` first - the Electron app requires compiled JavaScript
- Check that your `.env` file exists in the project root with valid credentials

### Database connection fails
- Run `npm run db:check` to diagnose connection issues
- Verify your Supabase URL and keys are correct
- Ensure the `optiroute` schema exists in your Supabase project

### Google Maps API errors
- Verify your API key has the required APIs enabled (Maps JavaScript API, Routes API, Places API)
- Check API key restrictions in Google Cloud Console

## Deployment

### Digital Ocean App Platform

The `deploy/` directory contains configuration for flexible deployment to Digital Ocean App Platform.

#### Deployment Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `embedded` | Single service with dispatch built into web-launcher | Demos, development, low-traffic |
| `standalone` | Separate web and dispatch services | Production, high-traffic, scalable |

#### Quick Deploy

```bash
# Deploy in embedded mode (single service)
./deploy/deploy.sh embedded

# Deploy in standalone mode (two services)
./deploy/deploy.sh standalone

# Preview without deploying
./deploy/deploy.sh --dry-run embedded
```

#### Manual Deploy

1. **Install `doctl`**: Ensure you have the Digital Ocean CLI setup and authenticated.

2. **Create App**:
   ```bash
   # For embedded mode
   doctl apps create --spec deploy/do-app-spec.embedded.yaml

   # For standalone mode
   doctl apps create --spec deploy/do-app-spec.standalone.yaml
   ```

3. **Set Secrets**: After deployment, set the following secrets in the Digital Ocean dashboard:
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
   - `GOOGLE_MAPS_API_KEY` - Google Maps API key
   - `DISPATCH_API_KEYS` - API key for dispatch service authentication
   - `TELEGRAM_BOT_TOKEN` - Telegram bot token (from @BotFather)
   - `RESEND_API_KEY` - Resend email API key

#### Build Commands

**Embedded mode:**
```bash
npm install && npm run build && cd web-launcher && npm install && cd ../dispatch-service && npm install && npm run build
```

**Run command:**
```bash
node web-launcher/server.js
```

## Dispatch Service

The dispatch service enables sending route assignments to drivers via Telegram and Email.

### Features

- **Telegram Integration** - Drivers receive route assignments via Telegram bot
- **Email Notifications** - Fallback email delivery via Resend or SendGrid
- **Driver Registration** - QR code-based Telegram registration flow
- **Multi-channel Dispatch** - Send via preferred channel with fallback support

### API Endpoints

When running in embedded mode, dispatch endpoints are available at `/dispatch/api/v1/...`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dispatch/api/v1/health` | GET | Health check |
| `/dispatch/api/v1/dispatch` | POST | Send route dispatch |
| `/dispatch/api/v1/dispatch/:id` | GET | Get dispatch status |
| `/dispatch/api/v1/telegram/webhook` | POST | Telegram webhook |
| `/dispatch/api/v1/telegram/registration/:driverId` | GET | Get registration link |
| `/dispatch/api/v1/telegram/send-registration` | POST | Email registration link |

### Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/botfather) on Telegram
2. Save the bot token
3. Set `TELEGRAM_BOT_TOKEN` environment variable
4. After deployment, the webhook is automatically configured

For detailed API documentation, see `dispatch-service/API.md`.

## License

MIT
