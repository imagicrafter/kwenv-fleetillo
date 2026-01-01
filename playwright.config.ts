import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for RouteIQ Testing Framework
 *
 * This configuration supports:
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - API testing with custom fixtures
 * - Parallel execution with configurable workers
 * - Multiple reporters (HTML, JSON, JUnit for CI)
 * - Screenshot and trace collection on failure
 * - Database verification before tests
 *
 * @see https://playwright.dev/docs/test-configuration
 */

export default defineConfig({
  // Test directory configuration
  testDir: './tests/e2e',

  // Glob patterns to search for test files
  testMatch: /.*\.(spec|test)\.(ts|js)/,

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Maximum time expect() should wait for the condition to be met
  expect: {
    timeout: 5000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for more stable runs
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  // HTML reporter for local development, JSON + JUnit for CI
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for API and web tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Maximum time each action can take
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,

    // Emulate user locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  // Configure projects for major browsers and API testing
  projects: [
    // API Testing Project
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
      },
    },

    // Database Verification Tests
    {
      name: 'database',
      testMatch: /.*database.*\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
      },
    },

    // Desktop Browsers
    {
      name: 'chromium',
      testMatch: /.*\.(e2e|browser)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'firefox',
      testMatch: /.*\.(e2e|browser)\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'webkit',
      testMatch: /.*\.(e2e|browser)\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile Browsers (uncomment to enable)
    // {
    //   name: 'Mobile Chrome',
    //   testMatch: /.*\.mobile\.spec\.ts/,
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   testMatch: /.*\.mobile\.spec\.ts/,
    //   use: { ...devices['iPhone 12'] },
    // },
    // Mobile Safari
    // {
    //   name: 'Mobile Safari',
    //   testMatch: /.*\.mobile\.spec\.ts/,
    //   use: { ...devices['iPhone 12'] },
    // },

    // Electron App
    {
      name: 'electron',
      testMatch: /.*\.electron\.spec\.ts/,
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Global setup and teardown
  // globalSetup: require.resolve('./tests/setup/playwright-global-setup.ts'),
  // globalTeardown: require.resolve('./tests/setup/playwright-global-teardown.ts'),
});
