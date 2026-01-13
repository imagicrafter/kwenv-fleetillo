import { defineConfig } from '@playwright/test';

/**
 * Minimal Playwright config for web-launcher tests
 * Uses the existing web-launcher server on port 8080
 */
export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30 * 1000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [['list']],

    use: {
        baseURL: 'http://localhost:8080',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: {
                viewport: { width: 1280, height: 720 },
            },
        },
    ],
});
