# Design: Issue #26 - API Layer Scalability: Separate Backend for Horizontal Scaling

## Overview

Enable flexible deployment where frontend and API can run either **embedded** (same server) or **separated** (different origins). This follows the same pattern as dispatch-service, which can be embedded in web-launcher or run standalone.

**Deployment Modes:**
- **Embedded (default)**: Frontend + API served from same Express server. Best for development, demos, and single-server deployments.
- **Separated**: Frontend on CDN/static host, API on horizontally scalable backend. Best for production at scale.

The key insight: **no code changes needed between modes** - only environment configuration changes.

### Key Design Decisions

1. **Mode detection via environment**: If `CORS_ALLOWED_ORIGINS` is set, assume separated mode; otherwise, embedded mode
2. **Graceful fallback**: When `API_BASE_URL` is not set in frontend, use relative URLs (same-origin/embedded)
3. **Shared CORS config**: Centralized module adapts behavior based on detected mode
4. **Health endpoints**: Always available regardless of mode, useful for monitoring
5. **Same codebase**: Single build works for both modes - no separate compilation needed
6. **API key authentication**: In separated mode, frontend must include API key in requests to prevent unauthorized access

## Architecture

### Embedded Mode (Development/Demos)

```
┌─────────────────────────────────────────────────────┐
│              Single Server Deployment               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │           web-launcher (Express)              │  │
│  │                                               │  │
│  │  ┌─────────────┐  ┌──────────────────────┐   │  │
│  │  │ Static HTML │  │  API Routes (/api/*) │   │  │
│  │  │  CSS, JS    │  │                      │   │  │
│  │  │   (public/) │  │  Same-origin calls   │   │  │
│  │  └─────────────┘  └──────────────────────┘   │  │
│  │                                               │  │
│  │  ┌──────────────────────────────────────────┐│  │
│  │  │ Embedded dispatch-service (optional)     ││  │
│  │  │  WebSocket on same port                  ││  │
│  │  └──────────────────────────────────────────┘│  │
│  └───────────────────────────────────────────────┘  │
│                        │                            │
│                        ▼                            │
│  ┌───────────────────────────────────────────────┐  │
│  │                 Supabase                      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

Environment:
  NODE_ENV=development (or production)
  API_BASE_URL=         (not set - uses relative URLs)
  CORS_ALLOWED_ORIGINS= (not set - same-origin only)
```

### Separated Mode (Production Scaling)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Production Deployment                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────┐        ┌────────────────────────────────┐   │
│  │  CDN/Static Host   │        │   DigitalOcean App Platform    │   │
│  │  (app.fleetillo.   │        │   (api.fleetillo.com)          │   │
│  │       com)         │        │                                │   │
│  │                    │        │  ┌────────────┐ ┌────────────┐ │   │
│  │  ┌──────────────┐  │        │  │ Instance 1 │ │ Instance 2 │ │   │
│  │  │ Static HTML  │  │  CORS  │  │  API + WS  │ │  API + WS  │ │   │
│  │  │  CSS, JS     │──┼───────▶│  └────────────┘ └────────────┘ │   │
│  │  │ (built from  │  │        │         ▲             ▲        │   │
│  │  │  shared/)    │  │        │         │   Health    │        │   │
│  │  └──────────────┘  │        │     ┌───┴─────────────┴───┐    │   │
│  └────────────────────┘        │     │   Load Balancer     │    │   │
│                                │     └─────────────────────┘    │   │
│                                └────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Supabase (Database)                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

Environment:
  NODE_ENV=production
  API_BASE_URL=https://api.fleetillo.com
  CORS_ALLOWED_ORIGINS=https://app.fleetillo.com,https://staging.fleetillo.com
```

### Mode Detection Logic

The system automatically detects which mode to use:

| Condition | Mode | Behavior |
|-----------|------|----------|
| `CORS_ALLOWED_ORIGINS` not set | Embedded | Same-origin only, relaxed cookies |
| `CORS_ALLOWED_ORIGINS` set | Separated | Cross-origin enabled, secure cookies |
| `API_BASE_URL` not set (frontend) | Embedded | Uses relative URLs (`/api/*`) |
| `API_BASE_URL` set (frontend) | Separated | Uses absolute URLs |

## Components and Interfaces

### Shared CORS Configuration Module

Create a new shared module for consistent CORS handling.

**File:** `src/config/cors.config.ts`

```typescript
export interface CorsConfig {
  allowedOrigins: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export function getCorsConfig(): CorsConfig {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const isDev = process.env.NODE_ENV === 'development';
  
  let allowedOrigins: string[];
  
  if (envOrigins) {
    allowedOrigins = envOrigins.split(',').map(o => o.trim());
  } else if (isDev) {
    allowedOrigins = ['http://localhost:3000', 'http://localhost:8080'];
  } else {
    allowedOrigins = []; // Same-origin only
  }
  
  return {
    allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };
}

export function getCorsMiddlewareOptions() {
  const config = getCorsConfig();
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (same-origin, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (config.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: config.credentials,
    methods: config.methods,
    allowedHeaders: config.allowedHeaders
  };
}
```

### API Key Authentication Middleware

In separated mode, all API requests must include a valid API key. This prevents unauthorized access from origins that might bypass CORS (e.g., server-side requests, curl).

**File:** `src/middleware/api-key.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * API Key validation middleware.
 * - In embedded mode (API_KEY not set): Skip validation
 * - In separated mode (API_KEY set): Require valid key in header
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const expectedKey = process.env.API_KEY;
  
  // Skip validation in embedded mode (no API_KEY configured)
  if (!expectedKey) {
    return next();
  }
  
  // Allow health checks without API key (for load balancer)
  if (req.path === '/health' || req.path === '/health/ready') {
    return next();
  }
  
  const providedKey = req.headers['x-api-key'] as string;
  
  if (!providedKey) {
    return res.status(401).json({ 
      error: { code: 'MISSING_API_KEY', message: 'API key required' }
    });
  }
  
  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(providedKey, expectedKey)) {
    return res.status(403).json({ 
      error: { code: 'INVALID_API_KEY', message: 'Invalid API key' }
    });
  }
  
  next();
}

function timingSafeEqual(a: string, b: string): boolean {
  const crypto = require('crypto');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

**Application in Express:**

```typescript
// web-launcher/server.js or src/app.ts
import { validateApiKey } from './middleware/api-key.middleware';

// Apply before routes, after CORS
app.use(validateApiKey);
```

**Frontend Usage (api-client.js):**

```javascript
// In separated mode, API_KEY is injected at build time or runtime
const API_KEY = window.__FLEETILLO_API_KEY__ || '';

async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add API key header in separated mode
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include' // For cookies in cross-origin
  });
  
  return response;
}
```

### Health Check Endpoints

**File:** `src/routes/health.routes.ts`

```typescript
import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase';

const router = Router();

// Basic health check - always returns OK if server is running
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ready check - verifies database connectivity
router.get('/health/ready', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('customers').select('id').limit(1);
    
    if (error) throw error;
    
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

export default router;
```

### Session Cookie Configuration

Update session middleware to support cross-origin cookies:

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || 'fleetillo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: process.env.CORS_ALLOWED_ORIGINS ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

## Files to Modify

### New Files

| File | Purpose |
|------|---------|
| `src/config/cors.config.ts` | Centralized CORS configuration |
| `src/middleware/api-key.middleware.ts` | API key validation for separated mode |
| `src/routes/health.routes.ts` | Health check endpoints |
| `.do/app-spec-api.yaml` | DigitalOcean App Spec for API-only deployment |

### Modified Files

| File | Changes |
|------|---------|
| `web-launcher/server.js` | Use shared CORS config, add health routes |
| `dispatch-service/src/index.ts` | Use shared CORS config, add health routes |
| `src/app.ts` | Use shared CORS config |

## API Design

### GET /health

Basic liveness check.

**Response (200):**
```json
{ "status": "ok", "timestamp": "2026-01-21T17:00:00Z" }
```

### GET /health/ready

Readiness check with database verification.

**Response (200):**
```json
{ "status": "ready", "database": "connected" }
```

**Response (503):**
```json
{ "status": "unavailable", "database": "disconnected" }
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_KEY` | API key for separated mode authentication | (secure random 32+ char string) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://app.fleetillo.com` |
| `API_BASE_URL` | Base URL for API (frontend config) | `https://api.fleetillo.com` |
| `SESSION_SECRET` | Secret for session signing | (secure random string) |

**Mode Behavior:**
- Embedded mode: `API_KEY`, `CORS_ALLOWED_ORIGINS`, and `API_BASE_URL` are NOT set
- Separated mode: All three variables ARE set

## DigitalOcean App Spec

**File:** `.do/app-spec-api.yaml`

```yaml
name: fleetillo-api
region: nyc
services:
  - name: api
    github:
      repo: imagicrafter/fleetillo
      branch: main
      deploy_on_push: true
    source_dir: /
    build_command: npm run build
    run_command: npm start
    http_port: 3000
    instance_size_slug: professional-xs
    instance_count: 2
    health_check:
      http_path: /health/ready
      initial_delay_seconds: 10
      period_seconds: 10
    envs:
      - key: NODE_ENV
        value: production
      - key: CORS_ALLOWED_ORIGINS
        value: ${FRONTEND_ORIGIN}
      - key: SUPABASE_URL
        type: SECRET
      - key: SUPABASE_KEY
        type: SECRET
```

## Dispatch Service WebSocket CORS

For WebSocket connections, verify origin on upgrade:

```typescript
// dispatch-service/src/index.ts
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  const config = getCorsConfig();
  
  if (origin && !config.allowedOrigins.includes(origin)) {
    ws.close(4003, 'Origin not allowed');
    return;
  }
  
  // Proceed with normal connection handling
});
```

## Testing Strategy

### Unit Tests
- CORS config parsing with various env values
- Origin validation logic

### Integration Tests
- Cross-origin requests with valid credentials
- Preflight OPTIONS handling
- Health endpoint responses
- Session cookie behavior cross-origin

### Manual Verification
- Deploy frontend to staging CDN
- Deploy API to separate staging instance
- Verify login flow works cross-origin
- Verify WebSocket dispatch works cross-origin
