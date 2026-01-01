# Playwright Testing Framework Guide

## Overview

RouteIQ uses Playwright as its end-to-end testing framework. Playwright provides robust browser automation capabilities and excellent API testing support with features like:

- **Multi-browser support**: Test across Chromium, Firefox, and WebKit
- **Reliable automation**: Auto-waiting, web-first assertions, and network interception
- **Powerful tooling**: Trace viewer, codegen, and debugging tools
- **Parallel execution**: Run tests concurrently for faster feedback
- **Rich reporting**: HTML reports, screenshots, videos, and traces

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Configuration](#configuration)
4. [Writing Tests](#writing-tests)
5. [Running Tests](#running-tests)
6. [Fixtures and Helpers](#fixtures-and-helpers)
7. [Best Practices](#best-practices)
8. [CI/CD Integration](#cicd-integration)
9. [Debugging](#debugging)
10. [Advanced Topics](#advanced-topics)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Git

### Installation

Playwright is already installed as part of the project dependencies. To install browser binaries:

```bash
# Install all browsers
npx playwright install

# Install specific browsers
npx playwright install chromium firefox webkit

# Install browsers with system dependencies
npx playwright install --with-deps
```

### Quick Start

Run your first test:

```bash
# Run all tests
npm run test:e2e

# Run tests in a specific project
npx playwright test --project=api

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run a specific test file
npx playwright test tests/e2e/example-api.spec.ts
```

## Project Structure

```
tests/
├── e2e/                          # End-to-end test files
│   ├── example-api.spec.ts       # API test example
│   ├── example-browser.e2e.spec.ts # Browser test example
│   ├── vehicles.api.spec.ts      # Vehicles API tests
│   └── database-*.spec.ts        # Database verification tests
├── fixtures/                     # Custom Playwright fixtures
│   └── api-fixtures.ts           # API testing fixtures
├── helpers/                      # Test utilities and helpers
│   ├── api-client.ts             # HTTP client wrapper
│   └── test-utils.ts             # Common test utilities
├── setup/                        # Test setup and configuration
│   ├── database.ts               # Database setup utilities
│   ├── playwright-global-setup.ts
│   └── playwright-global-teardown.ts
└── verification/                 # One-off verification tests

playwright.config.ts              # Playwright configuration
.github/workflows/playwright.yml  # CI/CD workflow
```

## Configuration

### Playwright Configuration

The main configuration is in `playwright.config.ts`. Key settings include:

```typescript
{
  testDir: './tests/e2e',         // Test directory
  timeout: 30 * 1000,              // Test timeout (30s)
  fullyParallel: true,             // Run tests in parallel
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: process.env.CI ? 1 : undefined, // Worker processes
  reporter: ['html', 'json', 'junit', 'list'],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
}
```

### Projects

The configuration defines multiple test projects:

- **api**: API testing (matches `*.api.spec.ts`)
- **database**: Database verification tests
- **chromium**: Browser tests in Chrome
- **firefox**: Browser tests in Firefox
- **webkit**: Browser tests in Safari

### Environment Variables

Configure tests using environment variables:

```bash
# .env file
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
CI=false
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Arrange: Set up test data and preconditions

    // Act: Perform the action being tested

    // Assert: Verify the expected outcome
    expect(result).toBe(expected);
  });
});
```

### API Tests

Use the custom API fixtures for cleaner API testing:

```typescript
import { test, expect, TestDataFactory } from '../fixtures/api-fixtures.js';

test.describe('Vehicles API', () => {
  test('should create a vehicle', async ({ apiClient }) => {
    // Create test data
    const vehicleData = TestDataFactory.createVehicleData({
      name: 'Test Vehicle',
      licensePlate: 'ABC123',
    });

    // Make API request
    const response = await apiClient.post('/api/vehicles', vehicleData);

    // Assert response
    expect(response.status()).toBe(201);
    const vehicle = await response.json();
    expect(vehicle.name).toBe('Test Vehicle');
  });
});
```

### Browser Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Vehicle Management UI', () => {
  test('should display vehicle list', async ({ page }) => {
    // Navigate to page
    await page.goto('/vehicles');

    // Wait for content to load
    await page.waitForSelector('.vehicle-list');

    // Make assertions
    await expect(page.locator('h1')).toHaveText('Vehicles');
    await expect(page.locator('.vehicle-item')).toHaveCount(5);
  });
});
```

### Using Test Fixtures

Custom fixtures provide pre-configured utilities:

```typescript
test('should use API client', async ({ apiClient, dbSetup }) => {
  // apiClient: Pre-configured HTTP client
  // dbSetup: Automatic database setup/teardown

  const response = await apiClient.get('/api/vehicles');
  expect(response.ok()).toBeTruthy();
});
```

### Test Hooks

```typescript
test.describe('Feature', () => {
  test.beforeAll(async () => {
    // Run once before all tests
  });

  test.afterAll(async () => {
    // Run once after all tests
  });

  test.beforeEach(async () => {
    // Run before each test
  });

  test.afterEach(async () => {
    // Run after each test
  });
});
```

## Running Tests

### Command Line Options

```bash
# Run all tests
npx playwright test

# Run specific project
npx playwright test --project=api

# Run specific file
npx playwright test tests/e2e/vehicles.api.spec.ts

# Run tests matching pattern
npx playwright test vehicles

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run in UI mode (interactive)
npx playwright test --ui

# Run with specific number of workers
npx playwright test --workers=4

# Update snapshots
npx playwright test --update-snapshots
```

### NPM Scripts

```bash
# Run all E2E tests
npm run test:e2e

# Run with database check
npm run pretest:e2e && npm run test:e2e
```

### Filtering Tests

```typescript
// Run only this test
test.only('should run only this', async ({ page }) => {
  // ...
});

// Skip this test
test.skip('should skip this', async ({ page }) => {
  // ...
});

// Conditional skip
test.skip(process.env.CI, 'should skip in CI', async ({ page }) => {
  // ...
});

// Run tests with specific tag
test('should do something @smoke', async ({ page }) => {
  // ...
});
```

Then run: `npx playwright test --grep @smoke`

## Fixtures and Helpers

### API Client

Pre-configured HTTP client with convenience methods:

```typescript
import { test } from '../fixtures/api-fixtures.js';

test('example', async ({ apiClient }) => {
  // Simple requests
  const response = await apiClient.get('/api/vehicles');

  // With query parameters
  const filtered = await apiClient.get('/api/vehicles', {
    params: { status: 'available' }
  });

  // JSON shortcuts
  const data = await apiClient.getJson('/api/vehicles');
  const created = await apiClient.postJson('/api/vehicles', vehicleData);

  // Custom headers
  const authed = await apiClient.get('/api/admin', {
    headers: { 'Authorization': 'Bearer token' }
  });
});
```

### Test Data Factories

Generate consistent test data:

```typescript
import { TestDataFactory } from '../fixtures/api-fixtures.js';

// Create vehicle data
const vehicle = TestDataFactory.createVehicleData({
  name: 'Custom Name',
  year: 2024,
});

// Create service data
const service = TestDataFactory.createServiceData({
  service_type: 'delivery',
});

// Create maintenance schedule
const schedule = TestDataFactory.createMaintenanceScheduleData(vehicleId);
```

### Test Utilities

```typescript
import {
  generateTestId,
  assertValidUUID,
  assertObjectSchema,
  waitForCondition,
  retry,
} from '../helpers/test-utils.js';

// Generate unique IDs
const id = generateTestId('vehicle');

// Validate data formats
assertValidUUID(someId);
assertValidISODate(timestamp);

// Validate object structure
assertObjectSchema(response, {
  id: 'string',
  name: 'string',
  count: 'number',
  active: 'boolean',
});

// Wait for conditions
await waitForCondition(
  async () => (await apiClient.get('/status')).ok(),
  { timeout: 5000, interval: 100 }
);

// Retry operations
const result = await retry(
  async () => await someFlakeyOperation(),
  { maxAttempts: 3, initialDelay: 100 }
);
```

## Best Practices

### 1. Use Descriptive Test Names

```typescript
// ❌ Bad
test('test1', async () => { });

// ✅ Good
test('should create vehicle with valid data', async () => { });
```

### 2. Follow AAA Pattern

```typescript
test('should update vehicle status', async ({ apiClient }) => {
  // Arrange: Setup test data
  const vehicle = await createTestVehicle();

  // Act: Perform the action
  const response = await apiClient.patch(`/api/vehicles/${vehicle.id}`, {
    status: 'maintenance'
  });

  // Assert: Verify the result
  expect(response.status()).toBe(200);
  const updated = await response.json();
  expect(updated.status).toBe('maintenance');
});
```

### 3. Keep Tests Independent

```typescript
// Each test should be able to run independently
test('test A', async () => {
  // Don't rely on state from other tests
});

test('test B', async () => {
  // Create your own test data
});
```

### 4. Use Fixtures for Setup

```typescript
// ❌ Bad: Setup in every test
test('test 1', async ({ apiClient }) => {
  await setupDatabase();
  // ...
});

// ✅ Good: Use fixtures
test('test 1', async ({ apiClient, dbSetup }) => {
  // dbSetup fixture handles setup automatically
  // ...
});
```

### 5. Clean Up After Tests

```typescript
test('should create resource', async ({ apiClient }) => {
  const resource = await apiClient.postJson('/api/resource', data);

  try {
    // Test assertions...
  } finally {
    // Cleanup
    await apiClient.delete(`/api/resource/${resource.id}`);
  }
});
```

### 6. Use Meaningful Assertions

```typescript
// ❌ Bad
expect(response.status()).not.toBe(500);

// ✅ Good
expect(response.status()).toBe(200);
```

### 7. Handle Async Properly

```typescript
// ❌ Bad
test('test', async ({ page }) => {
  page.goto('/'); // Missing await!
});

// ✅ Good
test('test', async ({ page }) => {
  await page.goto('/');
});
```

## CI/CD Integration

### GitHub Actions

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/playwright.yml`):

```yaml
# Runs on push/PR to main/develop
# Tests on multiple Node.js versions
# Tests across different browsers and OS
# Uploads test results and reports
```

### Environment Setup in CI

```yaml
- name: Setup environment
  run: |
    cp .env.example .env
    echo "CI=true" >> .env
    # Add secrets in GitHub repository settings
```

### Viewing Test Results

After CI runs:
1. Go to Actions tab in GitHub
2. Click on the workflow run
3. Download artifacts (test results, reports, screenshots)

## Debugging

### Debug Mode

Run tests in debug mode with Playwright Inspector:

```bash
npx playwright test --debug
```

### Headed Mode

See the browser while tests run:

```bash
npx playwright test --headed
```

### UI Mode

Interactive test runner:

```bash
npx playwright test --ui
```

### Trace Viewer

View detailed test traces:

```bash
# Traces are captured on first retry by default
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Configured to capture on failure:

```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

Find them in `test-results/` directory.

### Console Logs

```typescript
test('debug test', async ({ page }) => {
  // Log to console
  console.log('Debug info:', someValue);

  // Capture browser console
  page.on('console', msg => console.log('Browser:', msg.text()));

  // Pause execution
  await page.pause();
});
```

## Advanced Topics

### Network Interception

```typescript
test('should mock API', async ({ page }) => {
  await page.route('**/api/vehicles', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.goto('/vehicles');
});
```

### Custom Matchers

```typescript
expect.extend({
  toBeValidVehicle(received) {
    const pass = received.id && received.name && received.licensePlate;
    return {
      pass,
      message: () => `Expected valid vehicle object`,
    };
  },
});
```

### Parameterized Tests

```typescript
const testCases = [
  { status: 'available', expected: 5 },
  { status: 'maintenance', expected: 2 },
  { status: 'retired', expected: 1 },
];

testCases.forEach(({ status, expected }) => {
  test(`should filter by ${status}`, async ({ apiClient }) => {
    const response = await apiClient.getJson(`/api/vehicles?status=${status}`);
    expect(response.data).toHaveLength(expected);
  });
});
```

### Page Object Model

```typescript
class VehiclesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/vehicles');
  }

  async addVehicle(data) {
    await this.page.click('button:has-text("Add")');
    await this.page.fill('[name=name]', data.name);
    await this.page.click('button[type=submit]');
  }

  async getVehicleCount() {
    return await this.page.locator('.vehicle-item').count();
  }
}

test('use page object', async ({ page }) => {
  const vehiclesPage = new VehiclesPage(page);
  await vehiclesPage.goto();
  await vehiclesPage.addVehicle({ name: 'Test' });
  expect(await vehiclesPage.getVehicleCount()).toBe(1);
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Test Generator](https://playwright.dev/docs/codegen)

## Troubleshooting

### Common Issues

**Tests timing out**
- Increase timeout in config or per-test
- Check for missing `await` keywords
- Verify network requests complete

**Flaky tests**
- Use auto-waiting instead of hard waits
- Ensure test independence
- Check for race conditions

**Browser installation fails**
- Run `npx playwright install --with-deps`
- Check system dependencies

**Database connection errors**
- Verify `.env` file exists and has correct values
- Run `npm run db:check`
- Ensure Supabase is accessible

## Support

For issues or questions:
1. Check this documentation
2. Review example tests
3. Consult Playwright docs
4. Ask the team
