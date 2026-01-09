"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path_1 = __importDefault(require("path"));
/**
 * Playwright E2E Test for Route Map Feature in Electron App
 *
 * This test launches the Electron app and verifies the route map functionality.
 */
let electronApp;
let page;
test_1.test.describe('Route Map Feature', () => {
    test_1.test.beforeAll(async () => {
        // Launch Electron app
        electronApp = await test_1._electron.launch({
            args: [path_1.default.join(__dirname, '../../electron-launcher/src/main.js')],
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });
        // Get the first window
        page = await electronApp.firstWindow();
        // Wait for the window to be ready
        await page.waitForLoadState('domcontentloaded');
    });
    test_1.test.afterAll(async () => {
        await electronApp.close();
    });
    (0, test_1.test)('should navigate to routes page', async () => {
        // Find and click the Routes nav link
        const routesLink = page.locator('a[href="routes.html"], .nav-link:has-text("Routes")');
        await routesLink.click();
        // Wait for routes page to load
        await page.waitForSelector('.page-header:has-text("Routes")');
        // Take a screenshot
        await page.screenshot({ path: 'test-results/routes-page.png' });
    });
    (0, test_1.test)('should display route map when clicking view button', async () => {
        // First navigate to routes page if not already there
        const routesLink = page.locator('a[href="routes.html"], .nav-link:has-text("Routes")');
        await routesLink.click();
        await page.waitForSelector('.page-header:has-text("Routes")');
        // Wait for routes table data to load (not the loading row)
        await page.waitForSelector('table tbody tr:not(.loading-row):not(.empty-row)', { timeout: 15000 });
        // Find the view (eye) button on the first route
        const viewButton = page.locator('table tbody tr:first-child .action-btn').first();
        // Debug: Print table contents
        const tableHTML = await page.evaluate(() => {
            const table = document.querySelector('table tbody');
            return table ? table.innerHTML : 'NO TABLE FOUND';
        });
        console.log('Table HTML (first 500 chars):', tableHTML.substring(0, 500));
        console.log('View button count:', await viewButton.count());
        if (await viewButton.count() > 0) {
            // Click the view button
            await viewButton.click();
            // Wait for map container to appear
            await page.waitForSelector('#map-view-container', { state: 'visible', timeout: 15000 });
            // Wait for Google Maps to load (check for google.maps object)
            await page.waitForFunction(() => {
                return typeof window.google !== 'undefined' &&
                    typeof window.google.maps !== 'undefined';
            }, { timeout: 15000 });
            // Wait a bit for map to render
            await page.waitForTimeout(2000);
            // Take screenshot of the map
            await page.screenshot({ path: 'test-results/route-map.png', fullPage: true });
            // Check console logs for debugging info
            page.on('console', msg => {
                console.log('PAGE LOG:', msg.text());
            });
            // Get the bookings data from console logs
            const consoleLogs = [];
            page.on('console', msg => {
                consoleLogs.push(msg.text());
            });
            // Evaluate the map state
            const mapState = await page.evaluate(() => {
                const mapDiv = document.getElementById('route-map');
                const container = document.getElementById('map-view-container');
                return {
                    mapDivExists: !!mapDiv,
                    containerVisible: container?.style.display !== 'none',
                    containerHeight: container?.offsetHeight,
                    mapDivHeight: mapDiv?.offsetHeight,
                    googleMapsLoaded: typeof window.google !== 'undefined',
                    // Try to get map center
                    mapCenter: window.map?.getCenter?.()?.toJSON?.() || null,
                    mapZoom: window.map?.getZoom?.() || null,
                    markersCount: window.markers?.length || 0
                };
            });
            console.log('Map State:', JSON.stringify(mapState, null, 2));
            // Assertions
            (0, test_1.expect)(mapState.mapDivExists).toBe(true);
            (0, test_1.expect)(mapState.containerVisible).toBe(true);
            (0, test_1.expect)(mapState.googleMapsLoaded).toBe(true);
            // The key assertion: if we have markers, check the zoom level
            // A zoom level of 4 indicates full US view, we expect 10+ for a specific area
            if (mapState.markersCount > 0) {
                console.log(`Found ${mapState.markersCount} markers`);
                console.log(`Map center: ${JSON.stringify(mapState.mapCenter)}`);
                console.log(`Map zoom: ${mapState.mapZoom}`);
                // If zoom is still 4 (default US view), the fitBounds didn't work
                (0, test_1.expect)(mapState.mapZoom).toBeGreaterThan(4);
            }
        }
        else {
            console.log('No view button found - no routes with stops available');
        }
    });
    (0, test_1.test)('should verify booking data has location coordinates', async () => {
        // Navigate to routes
        const routesLink = page.locator('a[href="routes.html"], .nav-link:has-text("Routes")');
        await routesLink.click();
        await page.waitForSelector('.page-header:has-text("Routes")');
        await page.waitForSelector('table tbody tr:not(.loading-row):not(.empty-row)', { timeout: 15000 });
        // Click view on first route
        const viewButton = page.locator('table tbody tr:first-child .action-btn').first();
        if (await viewButton.count() > 0) {
            // Listen for console logs BEFORE clicking
            const logs = [];
            page.on('console', msg => {
                logs.push(msg.text());
            });
            await viewButton.click();
            // Wait for map to attempt render
            await page.waitForTimeout(3000);
            // Check logs for booking data
            const bookingLogs = logs.filter(log => log.includes('Sorted bookings') ||
                log.includes('First booking sample') ||
                log.includes('Booking ') ||
                log.includes('Added position'));
            console.log('\n=== DEBUG LOGS FROM APP ===');
            bookingLogs.forEach(log => console.log(log));
            console.log('=========================\n');
            // Look for "Added position" logs - if none exist, coordinates aren't being found
            const positionLogs = logs.filter(log => log.includes('Added position'));
            if (positionLogs.length === 0) {
                console.error('NO POSITIONS WERE ADDED TO THE MAP - coordinates missing from booking data');
                // Check what the booking data looks like
                const bookingDataLog = logs.find(log => log.includes('First booking sample'));
                if (bookingDataLog) {
                    console.log('Booking data received:', bookingDataLog);
                }
            }
            else {
                console.log(`${positionLogs.length} positions added to map successfully`);
            }
        }
    });
});
//# sourceMappingURL=route-map.electron.spec.js.map