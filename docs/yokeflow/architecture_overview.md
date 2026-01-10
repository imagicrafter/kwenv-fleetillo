# OptiRoute Architecture Overview

This document provides a high-level overview of the OptiRoute application architecture, tech stack, and project structure.

## Application Purpose

OptiRoute is a route planning and management system for service-based businesses. It enables:

- Customer/client management with addresses and service locations
- Service type definitions with duration and pricing
- Booking/appointment scheduling (one-time and recurring)
- Fleet/vehicle management with service capabilities
- Automated route optimization using Google Routes API
- Geographic management with geocoding

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Web Application (Frontend)                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              React + TypeScript SPA                  │    │
│  │  (Dashboard, Customers, Bookings, Routes, Fleet)    │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │ HTTP/REST                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express.js REST API                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Controllers & Routes                    │    │
│  │      (Authentication, Validation, Error Handling)   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  TypeScript Service Layer                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Client   │ │ Service  │ │ Booking  │ │ Vehicle  │       │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Route    │ │ Location │ │ Route    │ │ Google   │       │
│  │ Service  │ │ Service  │ │ Planning │ │ Maps Svc │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Backend                         │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │   PostgreSQL DB   │  │    Auth & RLS     │              │
│  │  (optiroute schema)│  │                   │              │
│  └───────────────────┘  └───────────────────┘              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                             │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │ Google Maps API   │  │ Google Routes API │              │
│  │ (Geocoding)       │  │ (Optimization)    │              │
│  └───────────────────┘  └───────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.3.3 | Type-safe JavaScript |
| `@supabase/supabase-js` | ^2.39.0 | Supabase client for database |
| `dotenv` | ^16.3.1 | Environment variable management |
| `express` | ^4.22.1 | HTTP server and REST API |
| `cors` | ^2.8.5 | CORS middleware |
| `helmet` | ^8.1.0 | Security headers |
| `morgan` | ^1.10.1 | HTTP request logging |
| `express-async-errors` | ^3.1.1 | Async error handling |

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | UI library |
| `react-dom` | ^18.2.0 | React DOM rendering |
| `react-router-dom` | ^6.20.0 | Client-side routing |
| `@tanstack/react-query` | ^5.0.0 | Server state management |
| `axios` | ^1.6.0 | HTTP client |
| `tailwindcss` | ^3.4.0 | Utility-first CSS |
| `react-hook-form` | ^7.48.0 | Form handling |
| `zod` | ^3.22.0 | Schema validation |
| `@react-google-maps/api` | ^2.19.0 | Google Maps React components |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^5.0.0 | Frontend build tool |
| `jest` | ^29.7.0 | Unit testing |
| `@playwright/test` | ^1.40.0 | E2E testing |
| `ts-node` | ^10.9.2 | TypeScript execution |
| `eslint` | ^8.55.0 | Code linting |
| `prettier` | ^3.1.1 | Code formatting |

### Runtime Requirements

- **Node.js**: >= 18.0.0
- **Supabase**: Cloud or self-hosted instance
- **Google Cloud Platform**: Maps API and Routes API enabled

## Project Directory Structure

```
src/
├── config/
│   └── index.ts              # Environment configuration loader
├── errors/
│   ├── index.ts              # Error exports
│   ├── AppError.ts           # Base application error class
│   ├── codes.ts              # Error code constants
│   └── utils.ts              # Error utilities
├── services/
│   ├── supabase.ts           # Supabase client initialization
│   ├── client.service.ts     # Client CRUD operations
│   ├── service.service.ts    # Service type CRUD operations
│   ├── booking.service.ts    # Booking CRUD operations
│   ├── location.service.ts   # Location CRUD operations
│   ├── vehicle.service.ts    # Vehicle CRUD operations
│   ├── vehicle-location.service.ts  # Vehicle-Location junction
│   ├── route.service.ts      # Route CRUD operations
│   ├── route-planning.service.ts    # Route optimization logic
│   ├── googlemaps.service.ts        # Google Maps geocoding
│   └── google-routes.service.ts     # Google Routes API
├── types/
│   ├── index.ts              # Common types (Result, Pagination)
│   ├── client.ts             # Client types and row converters
│   ├── service.ts            # Service types
│   ├── booking.ts            # Booking types
│   ├── vehicle.ts            # Vehicle types
│   ├── vehicle-location.ts   # Vehicle-Location junction types
│   ├── route.ts              # Route types
│   ├── googlemaps.ts         # Google Maps types
│   └── google-routes.ts      # Google Routes API types
├── utils/
│   ├── index.ts              # Utility exports
│   └── logger.ts             # Logging utilities
├── middleware/
│   ├── error-handler.ts      # Global error handling middleware
│   ├── validation.ts         # Request validation middleware
│   └── request-logger.ts     # HTTP request logging
├── routes/
│   ├── index.ts              # Route aggregation
│   ├── client.routes.ts      # Client API routes
│   ├── service.routes.ts     # Service API routes
│   ├── booking.routes.ts     # Booking API routes
│   ├── vehicle.routes.ts     # Vehicle API routes
│   ├── location.routes.ts    # Location API routes
│   └── route.routes.ts       # Route API routes
├── controllers/
│   ├── client.controller.ts  # Client request handlers
│   ├── service.controller.ts # Service request handlers
│   ├── booking.controller.ts # Booking request handlers
│   ├── vehicle.controller.ts # Vehicle request handlers
│   ├── location.controller.ts# Location request handlers
│   └── route.controller.ts   # Route request handlers
├── app.ts                    # Express app configuration
├── server.ts                 # Server entry point
└── index.ts                  # Main entry point

frontend/
├── src/
│   ├── api/                  # API client and endpoint functions
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks (React Query)
│   ├── pages/                # Page components
│   ├── types/                # Frontend TypeScript types
│   ├── utils/                # Utility functions
│   └── styles/               # CSS and Tailwind configuration
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Core Design Patterns

### 1. Result Type Pattern

All service operations return a `Result<T>` type for consistent error handling:

```typescript
interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}
```

### 2. Soft Delete Pattern

All entities support soft deletion via a `deleted_at` column. Queries filter by `deleted_at IS NULL` unless specifically including deleted records.

### 3. Row Conversion Pattern

Database uses `snake_case` column names, TypeScript uses `camelCase`. Each entity has:
- `rowToEntity()` - Converts database row to TypeScript object
- `entityInputToRow()` - Converts input DTO to database row

### 4. Service Layer Pattern

Services encapsulate all business logic and database operations:
- Type definitions with database row mapping
- Input validation functions
- CRUD operations returning `Result<T>`
- Pagination and filtering support

## Database Schema

The application uses PostgreSQL via Supabase with a custom schema named `optiroute`.

**Tables:**
- `clients` - Customer records
- `services` - Service type definitions
- `locations` - All location types (client, depot, home)
- `vehicles` - Fleet vehicles with capabilities
- `vehicle_locations` - Junction table for vehicle-location assignments
- `bookings` - Service appointments
- `routes` - Planned/executed routes

See `optiroute_schema.sql` for complete DDL.

## External Integrations

### Google Maps Platform
- **Geocoding API**: Address to coordinates conversion
- **Places API**: Address autocomplete
- **Routes API**: Route optimization with waypoint ordering

See `google_maps_integration_guide.md` for implementation details.

## Related Documentation

- `optiroute_schema.sql` - Database DDL
- `rest_api_specification.md` - API endpoints
- `service_implementation_guide.md` - Service layer patterns
- `type_definitions_guide.md` - TypeScript types
- `environment_configuration_guide.md` - Environment setup
- `google_maps_integration_guide.md` - Maps API integration
- `route_planning_guide.md` - Route optimization algorithm
