import { defineConfig } from '@playwright/test';
import path from 'path';

/**
 * Playwright Configuration for Electron App Testing
 * 
 * This config is specifically for testing the Electron app
 * without starting a web server.
 */

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: /.*\.electron\.spec\.ts/,
    timeout: 60 * 1000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false,
    retries: 0,
    workers: 1,
    reporter: [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report-electron' }],
    ],
    use: {
        trace: 'on',
        screenshot: 'on',
        video: 'on',
    },
    // NO webServer - Electron tests launch the app directly
});
