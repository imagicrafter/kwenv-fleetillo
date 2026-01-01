# Test Setup Documentation

This directory contains shared setup utilities and global configuration for the test suite.

## Files

### `database.ts`
Provides reusable database setup/teardown functions for individual test suites:

```typescript
import { setupDatabaseForTests, teardownDatabase } from '../setup/database';

describe('My Feature Tests', () => {
  beforeAll(async () => {
    await setupDatabaseForTests(); // Initializes and verifies DB connection
  });

  afterAll(async () => {
    await teardownDatabase(); // Cleans up DB connection
  });

  // Your tests...
});
```

### `jest-global-setup.ts`
Runs **once before all Jest tests** to verify database connectivity. If the database is not accessible, all tests will be aborted with a clear error message.

### `jest-global-teardown.ts`
Runs **once after all Jest tests** to clean up database connections.

## Database Connection Verification

### Automatic Verification
Database connectivity is automatically verified in multiple layers:

1. **Pre-test script**: `pretest` and `pretest:e2e` hooks run `db:check` before tests
2. **Jest global setup**: Verifies connection once before any test suite runs
3. **Individual test suites**: Can use `setupDatabaseForTests()` for their own verification

### Manual Verification
You can manually check database connectivity:

```bash
npm run db:check
```

This will:
- Validate environment configuration
- Initialize the Supabase client
- Verify connection to the routeiq schema
- Display connection latency and status
- Exit with code 0 (success) or 1 (failure)

## Environment Configuration

Tests require the following environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SCHEMA=routeiq
```

For testing, you can use a separate `.env.test` file:

```bash
NODE_ENV=test
SUPABASE_SCHEMA=routeiq_test  # Use a separate test schema
```

## Usage Examples

### Basic Test Suite Setup
```typescript
import { setupDatabaseForTests, teardownDatabase } from '../setup/database';

describe('Service Tests', () => {
  beforeAll(async () => {
    const status = await setupDatabaseForTests();
    console.log(`Connected in ${status.latencyMs}ms`);
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  test('should perform database operation', async () => {
    // Your test that uses the database
  });
});
```

### Checking Connection Health During Tests
```typescript
import { isDatabaseConnected } from '../setup/database';

test('long running test', async () => {
  // ... some operations ...

  if (!isDatabaseConnected()) {
    throw new Error('Database connection lost during test');
  }

  // ... continue testing ...
});
```

## Troubleshooting

### Tests fail with "Database connection failed"

1. Check your `.env` file has the required variables
2. Verify the Supabase URL is correct and accessible
3. Ensure the `routeiq` schema exists in your database
4. Check network connectivity to Supabase

### Connection verification takes too long

The default timeout for database operations is 30 seconds (`DB_TEST_TIMEOUT`). If your connection consistently takes longer, you may need to:

1. Check your network connection
2. Verify Supabase service status
3. Consider using a geographically closer Supabase region

### "Schema does not exist" errors

Make sure the `SUPABASE_SCHEMA` environment variable matches an existing schema in your database:

```sql
-- Check existing schemas
SELECT schema_name FROM information_schema.schemata;

-- Create schema if needed
CREATE SCHEMA IF NOT EXISTS routeiq;
```
