# Fleetillo Environment Configuration Guide

This guide explains how to configure environment variables for the Fleetillo application.

## Environment Files

The application uses `.env` files for configuration:

```
.env                 # Default configuration
.env.local           # Local overrides (not committed)
.env.development     # Development-specific
.env.production      # Production-specific
.env.test            # Testing configuration
```

Load order: `.env` → `.env.{NODE_ENV}` → `.env.local`

## Required Variables

### Supabase Configuration

```bash
# Supabase project URL
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase anonymous/public key (for client-side)
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase service role key (for server-side, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database schema name
SUPABASE_SCHEMA=fleetillo
```

### Google Maps Platform

```bash
# Google Maps API key (Geocoding, Places, Routes APIs)
GOOGLE_MAPS_API_KEY=AIzaSy...
```

## Optional Variables

### Application Settings

```bash
# Environment mode
NODE_ENV=development  # development | production | test

# Server port
PORT=3000

# Log level
LOG_LEVEL=info  # debug | info | warn | error

# Enable debug mode
DEBUG=false
```

### API Configuration

```bash
# API prefix
API_PREFIX=/api

# API version
API_VERSION=v1
```

### Frontend Variables (Vite)

Frontend environment variables must be prefixed with `VITE_`:

```bash
# API base URL
VITE_API_URL=http://localhost:3000/api/v1

# Google Maps API key (for frontend maps)
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```

## Complete .env Example

```bash
# ============================================================================
# Fleetillo Environment Configuration
# ============================================================================

# Environment
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
DEBUG=false

# ============================================================================
# Supabase Configuration
# Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
# ============================================================================

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_SCHEMA=fleetillo

# ============================================================================
# Google Maps Platform
# Get API key from: https://console.cloud.google.com/apis/credentials
# ============================================================================

GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# ============================================================================
# API Configuration
# ============================================================================

API_PREFIX=/api
API_VERSION=v1

# ============================================================================
# Frontend (Vite) - Must be prefixed with VITE_
# ============================================================================

VITE_API_URL=http://localhost:3000/api/v1
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## Configuration Module

```typescript
// src/config/index.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment files
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  schema: string;
}

export interface GoogleMapsConfig {
  apiKey: string;
  // ... other maps config
}

export interface AppConfig {
  env: string;
  port: number;
  logLevel: string;
  debug: boolean;
  supabase: SupabaseConfig;
  googleMaps: GoogleMapsConfig;
  api: {
    prefix: string;
    version: string;
  };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const config: AppConfig = {
  env: getOptionalEnv('NODE_ENV', 'development'),
  port: getIntEnv('PORT', 3000),
  logLevel: getOptionalEnv('LOG_LEVEL', 'info'),
  debug: getBooleanEnv('DEBUG', false),
  supabase: {
    url: getRequiredEnv('SUPABASE_URL'),
    anonKey: getRequiredEnv('SUPABASE_KEY'),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    schema: getOptionalEnv('SUPABASE_SCHEMA', 'fleetillo'),
  },
  googleMaps: {
    apiKey: getRequiredEnv('GOOGLE_MAPS_API_KEY'),
  },
  api: {
    prefix: getOptionalEnv('API_PREFIX', '/api'),
    version: getOptionalEnv('API_VERSION', 'v1'),
  },
};

// Validation
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'GOOGLE_MAPS_API_KEY',
] as const;

export function validateConfig(): boolean {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

// Helper functions
export function isDevelopment(): boolean {
  return config.env === 'development';
}

export function isProduction(): boolean {
  return config.env === 'production';
}

export function isTest(): boolean {
  return config.env === 'test';
}

export default config;
```

---

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note the project URL and API keys

### 2. Get API Keys

In Supabase Dashboard:
- Go to **Settings** → **API**
- Copy **Project URL** → `SUPABASE_URL`
- Copy **anon public** key → `SUPABASE_KEY`
- Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Create Schema

Run the SQL from `fleetillo_schema.sql` in the SQL Editor.

---

## Google Cloud Platform Setup

### 1. Create Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable billing

### 2. Enable APIs

Navigate to **APIs & Services** → **Enable APIs** and enable:

- Geocoding API
- Places API
- Routes API
- Maps JavaScript API (for frontend)
- Distance Matrix API (optional)

### 3. Create API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the key → `GOOGLE_MAPS_API_KEY`

### 4. Restrict API Key (Recommended)

For production:

**Backend Key:**
- Restrict to IP addresses
- Limit to specific APIs

**Frontend Key:**
- Restrict to HTTP referrers (your domain)
- Limit to Maps JavaScript API

---

## Environment-Specific Configuration

### Development

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=true
PORT=3000
```

### Production

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=warn
DEBUG=false
PORT=8080
```

### Testing

```bash
# .env.test
NODE_ENV=test
LOG_LEVEL=error
SUPABASE_SCHEMA=fleetillo_test
```

---

## Security Best Practices

### 1. Never Commit Secrets

Add to `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
.env.production
```

### 2. Use Different Keys per Environment

- Development: Use test/development Supabase project
- Production: Use production project with restricted keys
- Testing: Use separate test schema

### 3. Rotate Keys Regularly

- Rotate Supabase service role key periodically
- Rotate Google API keys if compromised

### 4. Restrict API Key Permissions

- Google: Restrict to specific APIs and referrers
- Supabase: Use RLS policies, only use service role when needed

---

## Troubleshooting

### Missing Environment Variables

```
Error: Missing required environment variable: SUPABASE_URL
```

**Solution:** Ensure `.env` file exists and contains the variable.

### Supabase Connection Failed

```
Error: Supabase client not initialized
```

**Solution:** Check `SUPABASE_URL` and `SUPABASE_KEY` are correct.

### Google Maps API Error

```
Error: Google Maps API key not configured
```

**Solution:** Ensure `GOOGLE_MAPS_API_KEY` is set and the key has required APIs enabled.

### Wrong Schema

```
Error: relation "clients" does not exist
```

**Solution:** Verify `SUPABASE_SCHEMA=fleetillo` and schema exists in database.

---

## Validation on Startup

```typescript
// src/index.ts or src/app.ts
import { validateConfig } from './config/index.js';

// Validate before starting
if (!validateConfig()) {
  console.error('Configuration validation failed');
  process.exit(1);
}

// Continue with app initialization...
```
