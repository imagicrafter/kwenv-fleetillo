import { test, expect } from '@playwright/test';

/**
 * Multi-Service Booking E2E Test
 * 
 * Validates that bookings can have multiple services added and that
 * service names are correctly displayed (not "Unknown Service").
 * 
 * This test addresses the regression where service names were not
 * being properly saved/retrieved in the serviceItems array.
 */

const BASE_URL = process.env.WEB_URL || 'http://localhost:8080';
const TEST_PASSWORD = process.env.DEMO_PASSWORD || 'demo123';

test.describe('Multi-Service Booking', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(BASE_URL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button:has-text("Login")');
        await expect(page).toHaveURL(`${BASE_URL}/index.html`);

        // Navigate to bookings page
        await page.click('a[href="bookings.html"]');
        await expect(page).toHaveURL(`${BASE_URL}/bookings.html`);
    });

    test('should add multiple services to a booking and display service names correctly', async ({ page }) => {
        // Click to open edit modal for the first booking
        const editButton = page.locator('.edit-btn').first();
        await editButton.click();

        // Wait for modal to open
        await expect(page.locator('#add-booking-modal')).toBeVisible();
        await expect(page.locator('#modal-title')).toContainText('Edit Booking');

        // Get the initial service count in the table
        const initialServiceRows = await page.locator('#selected-services-tbody tr:not(#no-services-row)').count();
        console.log(`Initial service count: ${initialServiceRows}`);

        // Add a second service by searching
        const serviceSearchInput = page.locator('#service-search');
        await serviceSearchInput.fill('clean');

        // Wait for search results
        await page.waitForTimeout(500);

        // Click the first service result from the dropdown
        const firstServiceResult = page.locator('#service-search-results > div').first();
        await expect(firstServiceResult).toBeVisible();
        await firstServiceResult.click();

        // Verify a second service was added to the table
        const updatedServiceRows = await page.locator('#selected-services-tbody tr:not(#no-services-row)').count();
        console.log(`Updated service count: ${updatedServiceRows}`);
        expect(updatedServiceRows).toBeGreaterThan(initialServiceRows);

        // Get the service names before saving
        const serviceNames: string[] = [];
        const serviceRows = page.locator('#selected-services-tbody tr:not(#no-services-row)');
        const rowCount = await serviceRows.count();

        for (let i = 0; i < rowCount; i++) {
            const row = serviceRows.nth(i);
            const serviceName = await row.locator('td').first().textContent();
            serviceNames.push(serviceName?.trim() || '');
            console.log(`Service ${i + 1}: ${serviceName?.trim()}`);
        }

        // Verify no "Unknown Service" appears before saving
        for (const name of serviceNames) {
            expect(name).not.toBe('Unknown Service');
            expect(name.length).toBeGreaterThan(0);
        }

        // Save the booking
        await page.click('button[type="submit"]:has-text("Save")');

        // Wait for modal to close
        await expect(page.locator('#add-booking-modal')).not.toBeVisible();

        // Wait a bit for the save to complete
        await page.waitForTimeout(1000);

        // Reopen the same booking to verify services persisted correctly
        await editButton.click();
        await expect(page.locator('#add-booking-modal')).toBeVisible();

        // Verify the service count is still the same
        const reloadedServiceRows = await page.locator('#selected-services-tbody tr:not(#no-services-row)').count();
        console.log(`Reloaded service count: ${reloadedServiceRows}`);
        expect(reloadedServiceRows).toBe(updatedServiceRows);

        // Verify all service names are still displayed correctly (not "Unknown Service")
        const reloadedServiceNames: string[] = [];
        const reloadedRows = page.locator('#selected-services-tbody tr:not(#no-services-row)');
        const reloadedRowCount = await reloadedRows.count();

        for (let i = 0; i < reloadedRowCount; i++) {
            const row = reloadedRows.nth(i);
            const serviceName = await row.locator('td').first().textContent();
            const name = serviceName?.trim() || '';
            reloadedServiceNames.push(name);
            console.log(`Reloaded Service ${i + 1}: ${name}`);

            // THE KEY ASSERTION: Verify service name is NOT "Unknown Service"
            expect(name).not.toBe('Unknown Service');
            expect(name.length).toBeGreaterThan(0);
        }

        // Verify the service names match what we saved
        expect(reloadedServiceNames.sort()).toEqual(serviceNames.sort());

        console.log('✅ Multi-service booking test passed!');
        console.log(`   - Added ${updatedServiceRows} services`);
        console.log(`   - All service names displayed correctly`);
        console.log(`   - No "Unknown Service" errors`);
    });

    test('should handle booking with single service correctly', async ({ page }) => {
        // Test that single-service bookings still work (backward compatibility)
        const editButton = page.locator('.edit-btn').first();
        await editButton.click();

        await expect(page.locator('#add-booking-modal')).toBeVisible();

        // Verify at least one service is present
        const serviceRows = await page.locator('#selected-services-tbody tr:not(#no-services-row)').count();
        expect(serviceRows).toBeGreaterThanOrEqual(1);

        // Verify the service name is not "Unknown Service"
        const firstServiceName = await page.locator('#selected-services-tbody tr').first().locator('td').first().textContent();
        expect(firstServiceName?.trim()).not.toBe('Unknown Service');
        expect(firstServiceName?.trim().length).toBeGreaterThan(0);

        console.log(`✅ Single service booking displays correctly: ${firstServiceName?.trim()}`);
    });
});
