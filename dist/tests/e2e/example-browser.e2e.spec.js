"use strict";
/**
 * Example Browser E2E Test
 *
 * Demonstrates browser automation capabilities with Playwright:
 * - Page navigation and interactions
 * - Element selectors and assertions
 * - Screenshots and videos
 * - Multi-browser testing
 *
 * This is an example test to showcase browser automation.
 * Note: This test will only run when there's an actual web application to test.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Example Browser Tests', () => {
    test_1.test.skip('should demonstrate page navigation', async ({ page }) => {
        // Skip this test as there's no UI yet
        // Uncomment and modify when you have a web application
        // Navigate to a page
        await page.goto('/');
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        // Take a screenshot
        await page.screenshot({ path: 'test-results/homepage.png' });
        // Verify page title
        await (0, test_1.expect)(page).toHaveTitle(/RouteIQ/);
    });
    test_1.test.skip('should demonstrate element interactions', async ({ page }) => {
        // Skip this test as there's no UI yet
        // Navigate to a page
        await page.goto('/vehicles');
        // Click a button
        await page.click('button:has-text("Add Vehicle")');
        // Fill a form
        await page.fill('input[name="name"]', 'Test Vehicle');
        await page.fill('input[name="licensePlate"]', 'ABC123');
        // Select from dropdown
        await page.selectOption('select[name="status"]', 'available');
        // Submit form
        await page.click('button[type="submit"]');
        // Wait for success message
        await (0, test_1.expect)(page.locator('.success-message')).toBeVisible();
    });
    test_1.test.skip('should demonstrate responsive design testing', async ({ page, viewport }) => {
        // Skip this test as there's no UI yet
        // Test on mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        // Verify mobile menu is visible
        await (0, test_1.expect)(page.locator('.mobile-menu')).toBeVisible();
        // Test on tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await (0, test_1.expect)(page.locator('.tablet-layout')).toBeVisible();
        // Test on desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        await (0, test_1.expect)(page.locator('.desktop-layout')).toBeVisible();
    });
    test_1.test.skip('should demonstrate form validation', async ({ page }) => {
        // Skip this test as there's no UI yet
        await page.goto('/vehicles/new');
        // Try to submit empty form
        await page.click('button[type="submit"]');
        // Verify validation errors
        await (0, test_1.expect)(page.locator('.error-message')).toContainText('Name is required');
        await (0, test_1.expect)(page.locator('.error-message')).toContainText('License plate is required');
        // Fill required fields
        await page.fill('input[name="name"]', 'Test Vehicle');
        await page.fill('input[name="licensePlate"]', 'ABC123');
        // Submit form
        await page.click('button[type="submit"]');
        // Verify success
        await (0, test_1.expect)(page).toHaveURL(/\/vehicles\/\w+/);
    });
    (0, test_1.test)('should demonstrate API mocking', async ({ page }) => {
        // This demonstrates how to mock API responses
        // Mock API response
        await page.route('**/api/vehicles', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: [
                        {
                            id: '1',
                            name: 'Mocked Vehicle',
                            licensePlate: 'MOCK123',
                            status: 'available',
                        },
                    ],
                }),
            });
        });
        // Now any request to /api/vehicles will get the mocked response
        (0, test_1.expect)(true).toBe(true);
    });
    (0, test_1.test)('should demonstrate waiting strategies', async ({ page }) => {
        // Different ways to wait for elements and conditions
        // Wait for a specific element
        // await page.waitForSelector('.loading-spinner', { state: 'hidden' });
        // Wait for network to be idle
        // await page.waitForLoadState('networkidle');
        // Wait for a specific URL
        // await page.waitForURL(/\/dashboard/);
        // Wait for a custom condition
        // await page.waitForFunction(() => document.querySelectorAll('.item').length > 0);
        // Custom timeout
        // await page.waitForSelector('.element', { timeout: 5000 });
        (0, test_1.expect)(true).toBe(true);
    });
});
test_1.test.describe('Example Accessibility Tests', () => {
    test_1.test.skip('should demonstrate accessibility testing', async ({ page }) => {
        // Skip this test as there's no UI yet
        // You can use @axe-core/playwright for accessibility testing
        await page.goto('/');
        // Check for basic accessibility issues
        // const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        // expect(accessibilityScanResults.violations).toEqual([]);
    });
});
test_1.test.describe('Example Performance Tests', () => {
    test_1.test.skip('should demonstrate performance metrics', async ({ page }) => {
        // Skip this test as there's no UI yet
        await page.goto('/');
        // Get performance metrics
        const metrics = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            return {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
            };
        });
        // Assert performance thresholds
        (0, test_1.expect)(metrics.domContentLoaded).toBeLessThan(2000); // Less than 2 seconds
        (0, test_1.expect)(metrics.loadComplete).toBeLessThan(3000); // Less than 3 seconds
    });
});
//# sourceMappingURL=example-browser.e2e.spec.js.map