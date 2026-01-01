# Quick Start: Database Connection Validation

## TL;DR

Your tests now automatically verify database connectivity before running. No action required!

```bash
npm test          # ✓ Auto-checks database first
npm run test:e2e  # ✓ Auto-checks database first
npm run db:check  # ✓ Manual check anytime
```

## What Changed?

### Before
```bash
npm test
# Tests start immediately
# Confusing errors if database is down
# "Cannot read property 'from' of undefined"
```

### After
```bash
npm test
# ✓ Validates configuration
# ✓ Checks database connection to routeiq schema
# ✓ Shows clear error if database unavailable
# → Tests only run if database is accessible
```

## How to Use

### 1. Normal Testing
Just run tests as usual - validation is automatic:
```bash
npm test
npm run test:e2e
npm run test:coverage
```

### 2. Manual Health Check
Check database anytime:
```bash
npm run db:check
```

Output when healthy:
```
============================================================
Database Connection Health Check
============================================================

  ✓ Configuration is valid
  Supabase URL: https://your-project.supabase.co
  Schema: routeiq

  ✓ Database connected successfully (145ms)

============================================================
✓ Health Check PASSED
============================================================
```

Output when unhealthy:
```
============================================================
Database Connection Health Check
============================================================

  ✓ Configuration is valid

  ✗ Database connection failed!

Error Details:
  Message: Database connection verification failed
  Code: SUPABASE_CONNECTION_FAILED

Connection Status:
  Connected: ✗ NO
  Error: fetch failed

Exit code: 1
```

### 3. In Your Test Files
Individual test suites can also verify:

```typescript
import { setupDatabaseForTests, teardownDatabase } from '../setup/database';

describe('My Feature Tests', () => {
  beforeAll(async () => {
    await setupDatabaseForTests(); // Throws if DB unavailable
  });

  afterAll(async () => {
    await teardownDatabase(); // Cleanup
  });

  test('my test', async () => {
    // Database is guaranteed to be connected
  });
});
```

## What Gets Validated?

1. **Configuration**
   - ✓ `SUPABASE_URL` is set and valid
   - ✓ `SUPABASE_KEY` is set
   - ✓ `SUPABASE_SCHEMA` is set (defaults to 'routeiq')

2. **Connectivity**
   - ✓ Can reach Supabase server
   - ✓ Authentication works
   - ✓ Can query database
   - ✓ Schema exists

3. **Performance**
   - ✓ Measures connection latency
   - ✓ Logs performance metrics

## Troubleshooting

### "Missing required environment variables"

**Solution:** Create/update `.env` file:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SCHEMA=routeiq
```

### "Database connection verification failed: fetch failed"

**Possible causes:**
- No internet connection
- Supabase service is down
- Wrong Supabase URL

**Solution:** Check your connection and verify Supabase URL

### "Schema does not exist"

**Solution:** Create the schema:
```sql
CREATE SCHEMA IF NOT EXISTS routeiq;
```

### Want to skip validation temporarily?

For faster iteration during development:
```bash
npm run test:watch  # Skips pretest hook
```

Or run Jest directly:
```bash
npx jest  # Runs global setup but not pretest
```

## Files Created

```
scripts/
  └── check-db-connection.ts        # Health check script

tests/setup/
  ├── database.ts                   # Reusable setup functions
  ├── jest-global-setup.ts          # Jest global setup
  ├── jest-global-teardown.ts       # Jest global teardown
  └── README.md                     # Test setup docs

docs/
  ├── DATABASE_CONNECTION_VALIDATION.md  # Full documentation
  └── QUICK_START_DB_VALIDATION.md       # This file

tsconfig.scripts.json               # TypeScript config for scripts
```

## npm Scripts Added

```json
{
  "scripts": {
    "build:scripts": "tsc -p tsconfig.scripts.json",
    "db:check": "npm run build:scripts && node dist/scripts/check-db-connection.js",
    "pretest": "npm run db:check",
    "pretest:e2e": "npm run db:check"
  }
}
```

## Benefits

✅ **No More Confusing Errors**: Know immediately if database is the problem
✅ **Fast Failure**: Don't waste time waiting for tests to fail
✅ **Clear Messages**: Exactly what's wrong and how to fix it
✅ **Automatic**: Works without any changes to your workflow
✅ **CI/CD Ready**: Perfect for automated environments
✅ **Development Friendly**: Manual check anytime with `npm run db:check`

## Learn More

See [DATABASE_CONNECTION_VALIDATION.md](./DATABASE_CONNECTION_VALIDATION.md) for complete documentation.
