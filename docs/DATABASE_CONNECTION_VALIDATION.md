# Database Connection Validation

This document describes the database connection validation system implemented for the RouteIQ TypeScript project.

## Overview

The system ensures that database connectivity to the **routeiq** schema is verified before tests run. This prevents tests from failing with confusing errors due to database connectivity issues.

## Components

### 1. Health Check Script
**Location:** `scripts/check-db-connection.ts`

A standalone script that validates database connectivity:

```bash
npm run db:check
```

**Output:**
```
============================================================
Database Connection Health Check
============================================================

Step 1: Validating configuration...
  ✓ Configuration is valid

Step 2: Connection details:
  Supabase URL: https://your-project.supabase.co
  Schema: routeiq
  Environment: development

Step 3: Initializing Supabase client and verifying connection...
  ✓ Database connection established successfully

Connection Status:
  Connected: ✓ YES
  Timestamp: 2025-12-28T06:26:46.518Z
  Latency: 145ms

============================================================
✓ Health Check PASSED
============================================================
```

**Exit Codes:**
- `0`: Database connection successful
- `1`: Database connection failed or configuration invalid

### 2. Test Setup Utilities
**Location:** `tests/setup/database.ts`

Provides reusable functions for test suites:

```typescript
import { setupDatabaseForTests, teardownDatabase } from '../setup/database';

describe('My Tests', () => {
  beforeAll(async () => {
    await setupDatabaseForTests(); // Verifies DB connection
  });

  afterAll(async () => {
    await teardownDatabase(); // Cleanup
  });

  // Your tests...
});
```

### 3. Jest Global Setup
**Location:** `tests/setup/jest-global-setup.ts`

Runs once before all Jest tests to verify database connectivity. If the database is not accessible, all tests are aborted with a clear error message.

### 4. Jest Global Teardown
**Location:** `tests/setup/jest-global-teardown.ts`

Runs once after all Jest tests complete to clean up database connections.

## How It Works

### Automatic Validation

Database connectivity is validated at multiple levels:

1. **Pre-test Hooks** (`pretest`, `pretest:e2e`)
   - Automatically run `npm run db:check` before test commands
   - Prevents tests from starting if database is unavailable

2. **Jest Global Setup**
   - Verifies connection once before any test suite runs
   - Provides detailed error messages if connection fails

3. **Individual Test Suites**
   - Can use `setupDatabaseForTests()` for suite-specific verification
   - Useful for tests that need guaranteed database access

### Validation Steps

The health check performs these steps:

1. **Configuration Validation**
   - Checks for required environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_KEY`
     - `SUPABASE_SCHEMA`
   - Validates URL format

2. **Connection Initialization**
   - Creates Supabase client with proper configuration
   - Sets up schema-specific connection to `routeiq`

3. **Connection Verification**
   - Performs actual database query to verify connectivity
   - Measures connection latency
   - Handles expected errors gracefully (e.g., table doesn't exist)

4. **Error Reporting**
   - Provides detailed error information
   - Logs connection status and latency
   - Returns structured error codes for debugging

## Usage

### Running Tests

Tests will automatically check database connectivity:

```bash
# Unit tests (includes automatic db:check)
npm test

# E2E tests (includes automatic db:check)
npm run test:e2e

# Watch mode (skips db:check for faster iteration)
npm run test:watch
```

### Manual Health Check

Check database connectivity anytime:

```bash
npm run db:check
```

### In CI/CD

The health check integrates seamlessly with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
steps:
  - name: Check Database Connection
    run: npm run db:check
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      SUPABASE_SCHEMA: routeiq

  - name: Run Tests
    run: npm test
    if: success()
```

## Configuration

### Environment Variables

Required variables in `.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SCHEMA=routeiq
```

### Test-Specific Configuration

Use `.env.test` for test-specific settings:

```bash
NODE_ENV=test
SUPABASE_SCHEMA=routeiq_test  # Separate test schema
```

## Error Handling

### Common Errors

**1. Missing Environment Variables**
```
Configuration validation failed
Please ensure all required environment variables are set:
  - SUPABASE_URL
  - SUPABASE_KEY
```

**Solution:** Check your `.env` file

**2. Network Connectivity Issues**
```
Database connection verification failed: TypeError: fetch failed
Error: getaddrinfo ENOTFOUND vtaufnxworztolfdwlll.supabase.co
```

**Solution:**
- Check your internet connection
- Verify Supabase URL is correct
- Check if Supabase service is accessible

**3. Schema Does Not Exist**
```
Database connection verification failed: schema "routeiq" does not exist
```

**Solution:** Create the schema in your database:
```sql
CREATE SCHEMA IF NOT EXISTS routeiq;
```

### Error Codes

The system uses structured error codes:

- `SUPABASE_CONNECTION_FAILED`: Cannot connect to database
- `SUPABASE_INITIALIZATION_FAILED`: Client initialization failed
- `SUPABASE_NOT_INITIALIZED`: Client not initialized before use
- `SUPABASE_QUERY_FAILED`: Database query failed

## Benefits

1. **Early Failure Detection**: Catch database issues before tests run
2. **Clear Error Messages**: Know exactly why database connection failed
3. **Consistent Testing**: All tests start with verified database access
4. **CI/CD Integration**: Easily integrate with automated workflows
5. **Development Experience**: Quick feedback on database availability
6. **Latency Monitoring**: Track database connection performance

## Architecture Decisions

### Why Pre-test Hooks?

Using `pretest` hooks ensures:
- Database check runs automatically with `npm test`
- No need to remember to run health check manually
- Consistent validation across all environments
- Fast failure before expensive test setup

### Why Global Setup in Jest?

Global setup provides:
- Single verification for entire test suite
- Detailed logging before tests start
- Clearer separation of concerns
- Better error messages than per-suite failures

### Why Both Approaches?

Layered validation ensures:
- Shell-level check (`pretest`) catches issues before Jest starts
- Jest global setup provides detailed test-specific context
- Individual test suites can verify as needed
- Maximum robustness with minimal overhead

## Future Enhancements

Potential improvements:

1. **Connection Pooling Validation**: Verify pool health
2. **Schema Migration Check**: Ensure migrations are up to date
3. **Performance Benchmarking**: Track connection latency over time
4. **Retry Logic**: Automatic retry with exponential backoff
5. **Health Metrics**: Export connection metrics for monitoring

## References

- [Supabase Client Documentation](https://supabase.com/docs/reference/javascript/introduction)
- [Jest Global Setup](https://jestjs.io/docs/configuration#globalsetup-string)
- [npm Scripts Hooks](https://docs.npmjs.com/cli/v9/using-npm/scripts#pre--post-scripts)
