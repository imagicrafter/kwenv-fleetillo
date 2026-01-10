# OptiRoute Application Specification

This document provides an overview of the OptiRoute application and serves as an index to detailed context files for coding agents.

## Application Overview

OptiRoute is a comprehensive route planning and management system designed for service-based businesses (field service, delivery, maintenance, etc.). The application enables businesses to:

- **Manage Customers (Clients)**: Create and maintain customer records with contact info, addresses, and service locations
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

## Context Files for Coding Agents

All detailed documentation is organized in `docs/yokeflow/` for task-specific use by coding agents:

### Database & Schema

| File | Purpose | Use When |
|------|---------|----------|
| [optiroute_schema.sql](yokeflow/optiroute_schema.sql) | Complete PostgreSQL DDL with all tables, indexes, and triggers | Setting up the database, understanding table structure, writing migrations |

### Architecture & Structure

| File | Purpose | Use When |
|------|---------|----------|
| [architecture_overview.md](yokeflow/architecture_overview.md) | High-level architecture, tech stack, directory structure | Starting a new feature, understanding system design, onboarding |

### API Development

| File | Purpose | Use When |
|------|---------|----------|
| [rest_api_specification.md](yokeflow/rest_api_specification.md) | Complete REST API endpoints with request/response examples | Building API endpoints, frontend API integration, testing APIs |

### Service Layer

| File | Purpose | Use When |
|------|---------|----------|
| [service_implementation_guide.md](yokeflow/service_implementation_guide.md) | Service patterns with complete code examples | Implementing new services, understanding CRUD patterns, error handling |
| [supabase_client_guide.md](yokeflow/supabase_client_guide.md) | Supabase client setup, queries, and patterns | Database operations, writing queries, understanding Supabase usage |

### Type Definitions

| File | Purpose | Use When |
|------|---------|----------|
| [type_definitions_guide.md](yokeflow/type_definitions_guide.md) | All TypeScript types for entities and operations | Writing type-safe code, understanding data shapes, creating new types |

### External Integrations

| File | Purpose | Use When |
|------|---------|----------|
| [google_maps_integration_guide.md](yokeflow/google_maps_integration_guide.md) | Google Maps/Geocoding/Places API integration | Implementing geocoding, address autocomplete, map features |
| [route_planning_guide.md](yokeflow/route_planning_guide.md) | Route optimization algorithm and Google Routes API | Implementing route planning, understanding optimization logic |

### Configuration

| File | Purpose | Use When |
|------|---------|----------|
| [environment_configuration_guide.md](yokeflow/environment_configuration_guide.md) | Environment variables, setup instructions, security | Setting up development environment, configuring deployments |

---

## Quick Reference

### Database Schema: `optiroute`

7 tables: `clients`, `services`, `locations`, `vehicles`, `vehicle_locations`, `bookings`, `routes`

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

| Task Type | Primary Context Files |
|-----------|----------------------|
| Database changes | `optiroute_schema.sql` |
| New API endpoint | `rest_api_specification.md`, `service_implementation_guide.md` |
| New service/entity | `service_implementation_guide.md`, `type_definitions_guide.md` |
| Frontend data fetching | `rest_api_specification.md`, `type_definitions_guide.md` |
| Geocoding/Maps features | `google_maps_integration_guide.md` |
| Route optimization | `route_planning_guide.md` |
| Environment setup | `environment_configuration_guide.md` |
| Understanding architecture | `architecture_overview.md` |
