# Context Priming Command

Read these files to understand the Fleetillo system:

## Essential Context (Read First)

1. **README.md** - Project overview and quick start
   - What Fleetillo is and why it exists
   - Setup and installation guide
   - Available scripts and commands
   - Technology stack overview

2. **docs/optiroute_code_specification.md** - Comprehensive system guide
   - Complete application overview
   - Index to all detailed documentation
   - Quick reference for patterns and conventions
   - Agent task routing guide

## Core Documentation

### API Documentation
- **dispatch-service/API.md** - Dispatch Service API
  - Driver notification system (Telegram + Email)
  - Dispatch endpoints and integration patterns
  - UI integration examples

### Database & Data Model
- **supabase/migrations/** - Database migrations
  - All tables, indexes, triggers, and constraints
  - Database schema name: `routeiq`

## After Reading, You Should Understand:

### System Overview
- **Purpose**: Route planning and management system for service-based businesses
- **Primary Functions**:
  - Customer and service management
  - Booking scheduling (one-time and recurring)
  - Fleet and driver management  
  - Optimized route planning with Google Routes API
  - Driver dispatch notifications via Telegram and Email

### Architecture Components
1. **Main Application** (TypeScript + Express)
   - REST API backend (`src/`)
   - Business logic in services layer
   - PostgreSQL via Supabase
   
2. **Web Launcher** (`web-launcher/`)
   - Browser-based UI (HTML/CSS/JS)
   - Express server with session management
   - Can run in embedded or standalone mode
   
3. **Dispatch Service** (`dispatch-service/`)
   - Driver notification system
   - Telegram bot integration
   - Email notifications via Resend
   - Can run embedded or standalone

4. **Electron Launcher** (`electron-launcher/`)
   - Desktop application wrapper

### Data Model
- **Database Schema**: `routeiq` (in Supabase)
- **Core Tables**: 
  - `clients` - Customer records
  - `services` - Service type definitions
  - `locations` - Service addresses with geocoding
  - `vehicles` - Fleet management
  - `drivers` - Driver records with contact methods
  - `bookings` - Service appointments
  - `routes` - Optimized route plans
  - `dispatch_jobs` - Notification delivery tracking
  
- **Patterns**: 
  - Soft delete via `deleted_at` timestamp
  - snake_case in database, camelCase in TypeScript
  - UUID primary keys
  - Foreign key constraints with ON DELETE CASCADE

### Key Components & Patterns

#### Services Layer (`src/services/`)
Core business logic modules:
- `client.service.ts` - Customer CRUD
- `service.service.ts` - Service types
- `booking.service.ts` - Appointment scheduling  
- `vehicle.service.ts` - Fleet management
- `driver.service.ts` - Driver management
- `route.service.ts` - Route CRUD
- `route-planning.service.ts` - Route optimization
- `googlemaps.service.ts` - Geocoding/address validation
- `google-routes.service.ts` - Routes API integration
- `dispatch-job.service.ts` - Dispatch tracking

#### Design Patterns
- **Result<T> Pattern**: All services return `Result<T>` for consistent error handling
- **Row Conversion**: `rowToEntity()` / `entityInputToRow()` for DB ↔ TypeScript mapping  
- **Soft Delete**: Filter all queries with `deleted_at IS NULL`
- **Service Encapsulation**: All business logic in service layer, controllers are thin

#### Type System (`src/types/`)
- Complete TypeScript definitions for all entities
- Separate types for: Entity, CreateInput, UpdateInput, Row
- Type converters handle case transformation

### How to Run

#### Development
```bash
# Build TypeScript
npm run build

# Web application (embedded mode - includes dispatch)
cd web-launcher && npm start  # Port 8080

# Backend API only
npm run dev  # Port 3000

# Dispatch service standalone
cd dispatch-service && npm start  # Port 3001
```

#### Testing
```bash
npm test              # Unit tests
npm run test:e2e      # Playwright E2E tests
npm run db:check      # Database connection validation
```

### How to Extend

#### Add New Entity/Service
1. Create types in `src/types/your-entity.ts`
2. Implement service in `src/services/your-entity.service.ts`
3. Add controller in `src/controllers/your-entity.controller.ts`
4. Define routes in `src/routes/your-entity.routes.ts`
5. Update `src/services/index.ts` and `src/routes/index.ts`

#### Database Changes
1. Create migration: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Apply via Supabase CLI or dashboard

#### UI Changes
- Web launcher: `web-launcher/public/` (HTML/CSS/JS)
- Electron: `electron-launcher/` (if desktop changes needed)

### Environment Variables

#### Required (All Modes)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  
SUPABASE_SCHEMA=routeiq
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

#### Dispatch Service
```env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM_ADDRESS=dispatch@fleetillo.com
EMAIL_FROM_NAME=Fleetillo Dispatch
DISPATCH_API_KEYS=comma,separated,api,keys
```

#### Optional
```env
NODE_ENV=development|production
PORT=3000
LOG_LEVEL=info|debug|error
DEMO_PASSWORD=your-demo-password
SESSION_SECRET=your-session-secret
```

### External Dependencies
- **Supabase**: PostgreSQL database hosting
- **Google Maps Platform**: Geocoding, Places, Routes APIs
- **Telegram Bot API**: Driver notifications
- **Resend**: Email delivery service

### Deployment Modes

1. **Embedded** (`DISPATCH_MODE=embedded`)
   - Single web server running both app and dispatch
   - Dispatch routes mounted at `/dispatch`
   - Best for: Demos, development, small deployments

2. **Standalone** (`DISPATCH_MODE=standalone`)
   - Separate services for app and dispatch
   - Independent scaling
   - Best for: Production, high traffic

---

## Quick Task Reference

| What You're Doing | Start Here |
|-------------------|-----------|
| Understanding the system | README.md → docs/optiroute_code_specification.md |
| Database changes | supabase/migrations/ |
| New API endpoint | dispatch-service/src/routes/ + dispatch-service/src/controllers/ |
| New entity/service | dispatch-service/src/services/ + dispatch-service/src/types/ |
| Dispatch/notifications | dispatch-service/API.md |
| Maps/geocoding | dispatch-service/src/services/google-maps.service.ts |
| Route optimization | dispatch-service/src/services/route.service.ts |
| Environment setup | .env.example |
