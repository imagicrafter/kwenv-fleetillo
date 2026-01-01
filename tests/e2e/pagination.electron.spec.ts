import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('Pagination Verification', () => {
    test.beforeAll(async () => {
        electronApp = await electron.launch({
            args: [path.join(__dirname, '../../electron-launcher/src/main.js')],
            env: { ...process.env, NODE_ENV: 'test' }
        });
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
    });

    test.afterAll(async () => {
        await electronApp.close();
    });

    const pages = [
        { name: 'Customers', url: 'customers.html', hash: 'Customers' },
        { name: 'Services', url: 'services.html', hash: 'Services' },
        { name: 'Locations', url: 'locations.html', hash: 'Locations' },
        { name: 'Vehicles', url: 'vehicles.html', hash: 'Vehicles' }
    ];

    for (const p of pages) {
        test(`should verify pagination controls on ${p.name} page`, async () => {
            console.log(`Verifying pagination for ${p.name}`);

            // Navigate
            const navLink = page.locator(`.nav-item:has-text("${p.name}"), .nav-child-item:has-text("${p.name}")`);
            // If strictly using href might be safer:
            // await page.click(`a[href="${p.url}"]`); 

            // Fallback to explicit navigation script if link not found easily or requires group expansion
            await page.evaluate((url) => {
                window.location.href = url;
            }, p.url);

            await page.waitForSelector('.pagination-footer', { timeout: 10000 });

            // Verify Footer Elements
            const footer = page.locator('.pagination-footer');
            await expect(footer).toBeVisible();

            const rowsSelect = footer.locator('#rows-select');
            await expect(rowsSelect).toBeVisible();

            const prevBtn = footer.locator('#prev-page-btn');
            await expect(prevBtn).toBeVisible();

            const nextBtn = footer.locator('#next-page-btn');
            await expect(nextBtn).toBeVisible();

            const info = footer.locator('#pagination-info');
            await expect(info).toBeVisible();

            // Log the info text to see if data loaded
            const infoText = await info.innerText();
            console.log(`[${p.name}] Pagination Info: ${infoText}`);

            // Check if buttons are disabled/enabled appropriately based on text
            // If "0-0 of 0", buttons should be disabled
            // If total > limit, next should be enabled (initially)
        });
    }
});
