"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path_1 = __importDefault(require("path"));
let electronApp;
let page;
test_1.test.describe('Pagination Verification', () => {
    test_1.test.beforeAll(async () => {
        electronApp = await test_1._electron.launch({
            args: [path_1.default.join(__dirname, '../../electron-launcher/src/main.js')],
            env: { ...process.env, NODE_ENV: 'test' }
        });
        page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
    });
    test_1.test.afterAll(async () => {
        await electronApp.close();
    });
    const pages = [
        { name: 'Customers', url: 'customers.html', hash: 'Customers' },
        { name: 'Services', url: 'services.html', hash: 'Services' },
        { name: 'Locations', url: 'locations.html', hash: 'Locations' },
        { name: 'Vehicles', url: 'vehicles.html', hash: 'Vehicles' }
    ];
    for (const p of pages) {
        (0, test_1.test)(`should verify pagination controls on ${p.name} page`, async () => {
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
            await (0, test_1.expect)(footer).toBeVisible();
            const rowsSelect = footer.locator('#rows-select');
            await (0, test_1.expect)(rowsSelect).toBeVisible();
            const prevBtn = footer.locator('#prev-page-btn');
            await (0, test_1.expect)(prevBtn).toBeVisible();
            const nextBtn = footer.locator('#next-page-btn');
            await (0, test_1.expect)(nextBtn).toBeVisible();
            const info = footer.locator('#pagination-info');
            await (0, test_1.expect)(info).toBeVisible();
            // Log the info text to see if data loaded
            const infoText = await info.innerText();
            console.log(`[${p.name}] Pagination Info: ${infoText}`);
            // Check if buttons are disabled/enabled appropriately based on text
            // If "0-0 of 0", buttons should be disabled
            // If total > limit, next should be enabled (initially)
        });
    }
});
//# sourceMappingURL=pagination.electron.spec.js.map