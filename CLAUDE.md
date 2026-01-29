# Fleetillo - AI Coding Rules

## 1. Core Principles

- **Immutability**: NEVER mutate objects. Always spread and create new objects.
- **Result\<T\> pattern**: All service functions return `Result<T>` — never throw from services.
- **Soft deletes**: Filter all queries with `deleted_at IS NULL`. Use `deletedAt` in TypeScript.
- **Type safety**: Strict TypeScript (`strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`).
- **Structured logging**: Use `createContextLogger('ServiceName')` — never raw `console.log`.
- **snake_case ↔ camelCase**: Database uses `snake_case`, TypeScript uses `camelCase`. Convert with `rowToEntity()` / `entityInputToRow()`.
- **Named exports**: Use named exports from services. Default exports only for Express routers.
- **No hardcoded secrets**: All credentials via environment variables.
- **Validate inputs**: Validate in service layer before database operations.
- **Small files**: 200-400 lines typical, 800 max. Extract when files grow.

## 2. Tech Stack

| Concern | Technology | Version |
|---------|-----------|---------|
| Language | TypeScript | ^5.3 |
| Runtime | Node.js | >= 18.0.0 |
| Module system | NodeNext (ESM) | ES2022 target |
| Backend | Express.js | ^4.22 |
| Database | Supabase (PostgreSQL) | ^2.39 |
| Desktop | Electron | (separate launcher) |
| Unit tests | Jest + ts-jest | ^29.7 |
| E2E tests | Playwright | ^1.40 |
| Linter | ESLint + @typescript-eslint | ^8.55 / ^6.14 |
| Formatter | Prettier | ^3.1 |
| External APIs | Google Maps, Google Routes, Telegram Bot, Resend |

## 3. Architecture

```
fleetillo/
├── src/
│   ├── config/              # App configuration
│   ├── controllers/         # Thin HTTP handlers (parse request → call service → send response)
│   ├── errors/              # Error classes and utilities
│   ├── middleware/           # Express middleware (validation, auth)
│   ├── routes/              # Express Router definitions
│   ├── services/            # Business logic (CRUD, validation, external APIs)
│   │   ├── supabase.ts      # Supabase client singleton
│   │   ├── index.ts         # Barrel exports for all services
│   │   └── *.service.ts     # One service file per entity
│   ├── types/               # TypeScript type definitions
│   │   ├── common.ts        # Result<T>, ID, Timestamps, PaginationParams
│   │   ├── index.ts         # Barrel exports
│   │   └── *.ts             # Entity, Row, CreateInput, UpdateInput, Filters per entity
│   ├── utils/               # Utilities (logger, helpers)
│   ├── app.ts               # Express app setup
│   └── server.ts            # Entry point
├── web-launcher/            # Browser-based UI (HTML/CSS/JS + Express server)
│   ├── server.js            # Web launcher Express server (port 8080)
│   └── public/              # Static frontend files
├── dispatch-service/        # Driver notification microservice
│   ├── src/
│   │   ├── api/             # REST handlers
│   │   ├── adapters/        # Telegram & Email adapters
│   │   ├── core/            # Orchestrator & message templates
│   │   └── db/              # Database repositories
│   └── templates/           # Handlebars message templates
├── electron-launcher/       # Desktop app wrapper
├── supabase/migrations/     # SQL migration files (YYYYMMDDHHMMSS_description.sql)
├── tests/
│   ├── unit/                # Jest unit tests
│   ├── e2e/                 # Playwright E2E tests
│   └── setup/               # Test setup/teardown
└── deploy/                  # DigitalOcean App Platform configs
```

**Pattern**: Layered architecture — Routes → Controllers → Services → Supabase.
Controllers are thin (parse HTTP, delegate to service, return result). All logic lives in services.

**Database schema**: `routeiq` (in Supabase). Core tables: `clients`, `services`, `locations`, `vehicles`, `drivers`, `bookings`, `routes`, `dispatch_jobs`, `settings`.

## 4. Code Style

### Naming

| Context | Convention | Example |
|---------|-----------|---------|
| TypeScript variables/functions | camelCase | `getVehicleById`, `createBooking` |
| TypeScript types/interfaces | PascalCase | `Vehicle`, `CreateVehicleInput`, `VehicleRow` |
| Database columns | snake_case | `assigned_driver_id`, `deleted_at` |
| Constants | UPPER_SNAKE_CASE | `VEHICLES_TABLE`, `VehicleErrorCodes` |
| Files | kebab-case | `vehicle.service.ts`, `route-planning.service.ts` |
| Service error classes | PascalCase + `Error` | `VehicleServiceError` |

### DO / DON'T

```typescript
// DO: Immutable update
function updateUser(user: User, name: string): User {
  return { ...user, name };
}

// DON'T: Mutation
function updateUser(user: User, name: string): User {
  user.name = name; // NEVER
  return user;
}
```

```typescript
// DO: Result<T> pattern
async function getVehicle(id: string): Promise<Result<Vehicle>> {
  try {
    const { data, error } = await supabase.from('vehicles').select().eq('id', id).single();
    if (error) return { success: false, error: new VehicleServiceError(/*...*/) };
    return { success: true, data: convertRowToVehicle(data as VehicleRow) };
  } catch (error) {
    return { success: false, error: new VehicleServiceError(/*...*/) };
  }
}

// DON'T: Throw from services
async function getVehicle(id: string): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').select().eq('id', id).single();
  if (error) throw new Error(error.message); // NEVER throw from services
  return data;
}
```

### Import Order

1. Node.js built-ins
2. External packages (`express`, `@supabase/supabase-js`)
3. Internal services (`../services/...`)
4. Internal types (`../types/...`) — use `import type` for type-only imports
5. Internal utils (`../utils/...`)

## 5. Logging

Use the structured logger, never raw `console.log`:

```typescript
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger('VehicleService');

// Levels: debug, info, warn, error
logger.debug('Getting vehicle by ID', { id });
logger.info('Vehicle created successfully', { vehicleId: vehicle.id, name: vehicle.name });
logger.warn('Hard deleting vehicle', { id });
logger.error('Failed to create vehicle', error);
```

- **debug**: Method entry, query parameters
- **info**: Successful operations (created, updated, deleted)
- **warn**: Dangerous operations (hard delete), degraded state
- **error**: Failed operations, unexpected errors

Production uses JSON format; development uses pretty-printed colored output.

## 6. Testing

### Framework & Configuration

- **Unit tests**: Jest + ts-jest, files in `tests/unit/` matching `*.test.ts`
- **E2E tests**: Playwright, files in `tests/e2e/` matching `*.spec.ts`
- **Test naming**: `*.api.spec.ts` (API tests), `*.e2e.spec.ts` (browser tests)

### Running Tests

```bash
npm test                 # Unit tests (runs db:check first)
npm run test:watch       # Unit tests in watch mode
npm run test:coverage    # Unit tests with coverage
npm run test:e2e         # Playwright E2E tests
```

### Test Pattern

```typescript
import { createService, hardDeleteService } from '../../../src/services/index';
import { initializeSupabase, resetSupabaseClient } from '../../../src/services/supabase';

let createdId: string | null = null;

describe('Entity CRUD Verification', () => {
  beforeAll(async () => { await initializeSupabase(); });
  afterAll(async () => {
    if (createdId) { await hardDeleteEntity(createdId); }
    resetSupabaseClient();
  });

  test('should create entity', async () => {
    const result = await createEntity(input);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    createdId = result.data!.id;
  });
});
```

Tests run against a real Supabase database — `beforeAll` initializes the connection, `afterAll` cleans up test data with hard deletes.

## 7. Type System Pattern

Each entity has 4 types + 2 converter functions in `src/types/<entity>.ts`:

```typescript
// 1. Entity (camelCase, used in app code)
export interface Vehicle extends Timestamps {
  id: ID;
  name: string;
  status: VehicleStatus;
  // ...
}

// 2. Row (snake_case, matches database columns)
export interface VehicleRow {
  id: string;
  name: string;
  status: VehicleStatus;
  created_at: string;
  deleted_at: string | null;
  // ...
}

// 3. CreateInput (fields for creating)
export interface CreateVehicleInput {
  name: string;
  status?: VehicleStatus;
  // ...
}

// 4. UpdateInput (partial create + required id)
export interface UpdateVehicleInput extends Partial<CreateVehicleInput> {
  id: ID;
}

// 5. Filters (query parameters)
export interface VehicleFilters {
  status?: VehicleStatus;
  searchTerm?: string;
  includeDeleted?: boolean;
}

// Converter: Row → Entity
export function rowToVehicle(row: VehicleRow): Vehicle { /* ... */ }

// Converter: Input → Row (only includes defined fields)
export function vehicleInputToRow(input: CreateVehicleInput): Partial<VehicleRow> { /* ... */ }
```

**Key rules for converters:**
- `rowToEntity`: Use `?? undefined` for nullable DB fields, `new Date()` for timestamp strings
- `inputToRow`: Only include fields where `input.field !== undefined` to avoid overwriting existing values
- `null` in database ↔ `undefined` in TypeScript

## 8. Common Patterns

### Service CRUD (every entity follows this)

```typescript
import { getAdminSupabaseClient, getSupabaseClient } from './supabase';
import { createContextLogger } from '../utils/logger';
import type { Result } from '../types/common';

const logger = createContextLogger('EntityService');
const TABLE = 'entities';

export class EntityServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'EntityServiceError';
    this.code = code;
    this.details = details;
  }
}

export const EntityErrorCodes = {
  NOT_FOUND: 'ENTITY_NOT_FOUND',
  CREATE_FAILED: 'ENTITY_CREATE_FAILED',
  UPDATE_FAILED: 'ENTITY_UPDATE_FAILED',
  DELETE_FAILED: 'ENTITY_DELETE_FAILED',
  QUERY_FAILED: 'ENTITY_QUERY_FAILED',
  VALIDATION_FAILED: 'ENTITY_VALIDATION_FAILED',
} as const;

// Use admin client to bypass RLS, fallback to regular client
const supabase = getAdminSupabaseClient() || getSupabaseClient();

// All queries filter: .is('deleted_at', null)
// All deletes: .update({ deleted_at: new Date().toISOString() })
// Hard delete requires admin client
```

### Controller Handler Pattern

```typescript
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input: CreateEntityInput = req.body;
    const result = await createEntity(input);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
};
```

### Route Definition Pattern

```typescript
import { Router } from 'express';
import * as entityController from '../controllers/entity.controller';
import { validateIdParam, validateRequired } from '../middleware/validation';

const router = Router();

router.get('/', entityController.getAll);
router.get('/:id', validateIdParam('id'), entityController.getById);
router.post('/', validateRequired(['name']), entityController.create);
router.put('/:id', validateIdParam('id'), entityController.update);
router.delete('/:id', validateIdParam('id'), entityController.remove);

export default router;
```

## 9. Database Conventions

- **Schema**: `routeiq` (set via `SUPABASE_SCHEMA`)
- **Primary keys**: UUID, auto-generated
- **Soft delete**: `deleted_at` timestamp column on all tables
- **Timestamps**: `created_at` and `updated_at` (auto-managed by triggers)
- **Foreign keys**: `ON DELETE CASCADE` where appropriate
- **Migrations**: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- **Supabase client**: Use `getAdminSupabaseClient()` to bypass RLS; falls back to `getSupabaseClient()`

## 10. Development Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run build:watch` | Watch mode TypeScript compilation |
| `npm start` | Run production server (port 3000) |
| `npm run dev` | Dev server with hot reload (port 3000) |
| `cd web-launcher && npm start` | Web UI (port 8080, embedded mode) |
| `npm test` | Run Jest unit tests |
| `npm run test:coverage` | Unit tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier format |
| `npm run db:check` | Verify database connection |
| `npm run check-secrets` | Scan for hardcoded secrets |

## 11. AI Coding Assistant Instructions

1. **Read before editing**: Always read existing files before modifying. Understand the patterns in place.
2. **Follow Result\<T\>**: Service functions return `Result<T>`, never throw. Check `result.success` before accessing `result.data`.
3. **Use existing patterns**: When adding a new entity, follow the exact structure in `src/types/vehicle.ts`, `src/services/vehicle.service.ts`, `src/controllers/vehicle.controller.ts`, and `src/routes/vehicle.routes.ts`.
4. **Never mutate**: Always create new objects with spread operator. This applies to all data transformations.
5. **Use the logger**: `createContextLogger('YourService')` for all services. Never use `console.log`.
6. **Maintain type safety**: Use `import type` for type-only imports. Avoid `any` — ESLint enforces `@typescript-eslint/no-explicit-any: error`.
7. **Database conventions**: `snake_case` columns, soft delete with `deleted_at IS NULL` filter, converters for case transformation.
8. **Register new exports**: When adding services/types, update `src/services/index.ts` and `src/types/index.ts` barrel files.
9. **Run verification**: After changes, run `npm run build` to catch type errors and `npm test` for unit tests.
10. **Security first**: No hardcoded secrets, validate all inputs, use parameterized queries (Supabase client handles this), run `npm run check-secrets` before committing.
