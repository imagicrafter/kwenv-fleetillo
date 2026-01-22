# OptiRoute Application Specification

This document provides an overview of the OptiRoute application for coding agents.

## Application Overview

OptiRoute is a comprehensive route planning and management system designed for service-based businesses (field service, delivery, maintenance, etc.). The application enables businesses to:

- **Manage Customers**: Create and maintain customer records with contact info, addresses, and service locations
- **Define Services**: Configure service types with duration estimates, pricing, and scheduling requirements
- **Book Appointments**: Schedule one-time or recurring service bookings for customers
- **Manage Fleet**: Track vehicles, their capabilities, and service type assignments
- **Plan Optimized Routes**: Automatically generate and optimize routes for vehicles based on bookings
- **Geographic Management**: Handle locations, geocoding, and distance calculations

## Tech Stack Summary

**Backend**: TypeScript, Express.js, Supabase (PostgreSQL)
**Frontend**: React + TypeScript SPA (Vite, TailwindCSS, React Query)
**External APIs**: Google Maps Platform (Geocoding, Places, Routes APIs)

---

## Quick Reference

### Database Schema: `optiroute`

7 tables: `customers`, `services`, `locations`, `vehicles`, `vehicle_locations`, `bookings`, `routes`

### Key Patterns

1. **Result Type**: All service functions return `Result<T>` for consistent error handling
2. **Soft Deletes**: All entities use `deleted_at` column (filter by `deleted_at IS NULL`)
3. **Type Conversions**: Database uses snake_case, TypeScript uses camelCase
4. **Admin Client**: Use `getAdminSupabaseClient()` to bypass RLS when needed

### Required Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_SCHEMA=optiroute
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

## Agent Task Routing

| Task Type | Reference Locations |
|-----------|---------------------|
| Database changes | `supabase/migrations/`, `dispatch-service/src/services/` |
| New API endpoint | `dispatch-service/src/routes/`, `dispatch-service/src/controllers/` |
| New service/entity | `dispatch-service/src/services/`, `dispatch-service/src/types/` |
| Frontend data fetching | `web-launcher/src/services/`, `dispatch-service/src/routes/` |
| Geocoding/Maps features | `dispatch-service/src/services/google-maps.service.ts` |
| Route optimization | `dispatch-service/src/services/route.service.ts` |
| Environment setup | `.env.example`, `dispatch-service/.env.example` |
| Understanding architecture | `README.md`, `.claude/README.md` |
