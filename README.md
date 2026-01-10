# RouteIQ

A route planning and management system for service-based businesses built with TypeScript, Electron, and Supabase.

## Overview

RouteIQ helps service-based businesses efficiently manage their daily operations by providing:

- **Customer Management** - Maintain a comprehensive client database with service addresses
- **Service Catalog** - Manage services with configurable average service times
- **Vehicle Fleet Management** - Track vehicles with service type tagging and maintenance schedules
- **Booking Scheduler** - Schedule one-time and recurring service appointments
- **Route Optimization** - Generate optimized daily route plans using Google Routes API
- **Address Validation** - Validate and geocode addresses using Google Maps API

## Technology Stack

- **Runtime:** Node.js (>= 18.0.0)
- **Language:** TypeScript
- **Desktop App:** Electron
- **Database:** Supabase (PostgreSQL)
- **APIs:** Google Routes API, Google Maps API
- **Testing:** Playwright, Jest

## Prerequisites

- Node.js >= 18.0.0
- npm
- A Supabase account and project
- Google Cloud account with Maps API and Routes API enabled

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/imagicrafter/routeIQ-typescript.git
   cd routeIQ-typescript
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
   SUPABASE_SCHEMA=routeiq

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
routeiq-typescript/
├── electron-launcher/       # Electron desktop application
│   ├── src/
│   │   ├── main.js         # Electron main process
│   │   ├── preload.js      # Preload script for IPC
│   │   └── ui/             # HTML/CSS frontend files
│   └── package.json
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
- Ensure the `routeiq` schema exists in your Supabase project

### Google Maps API errors
- Verify your API key has the required APIs enabled (Maps JavaScript API, Routes API, Places API)
- Check API key restrictions in Google Cloud Console

## Deployment
 
 ### Digital Ocean App Platform
 
 This repository includes a `do-app-spec.yaml` file for easy deployment to Digital Ocean App Platform.
 
 1. **Install `doctl`**: Ensure you have the Digital Ocean setup and authenticated.
 2. **Create App**: Run the following command to create and deploy the app:
    ```bash
    doctl apps create --spec do-app-spec.yaml
    ```
 3. **Environment Variables**: The `do-app-spec.yaml` contains placeholder or initial environment variables. **IMPORTANT:** You should update these values in the Digital Ocean dashboard after deployment, especially secrets like `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GOOGLE_MAPS_API_KEY`.
 
 The generic build command used is:
 ```bash
 npm install && npm run build && cd web-launcher && npm install
 ```
 And the run command:
 ```bash
 node web-launcher/server.js
 ```
 
 ## License

MIT
