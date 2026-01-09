"use strict";
/**
 * Booking Creation UI - Verification Test
 *
 * This test verifies the booking creation UI feature works correctly.
 * It tests:
 * - UI loads correctly
 * - Form elements are present and interactive
 * - Booking type toggle works (one-time vs recurring)
 * - Client/service selection dropdowns
 * - Form validation
 * - Form submission with API integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Booking Creation UI', () => {
    test_1.test.beforeEach(async ({ page }) => {
        // Navigate to the booking creation page
        await page.goto('/ui/booking-create.html');
        await page.waitForLoadState('domcontentloaded');
    });
    (0, test_1.test)('should load the booking creation page', async ({ page }) => {
        // Verify page title
        await (0, test_1.expect)(page).toHaveTitle('Create Booking - RouteIQ');
        // Verify header is present
        await (0, test_1.expect)(page.locator('header h1')).toHaveText('Create New Booking');
        await (0, test_1.expect)(page.locator('header p')).toHaveText('Schedule a one-time or recurring service booking');
    });
    (0, test_1.test)('should have all required form sections', async ({ page }) => {
        // Verify form sections exist
        await (0, test_1.expect)(page.locator('.form-section h2').filter({ hasText: 'Booking Type' })).toBeVisible();
        await (0, test_1.expect)(page.locator('.form-section h2').filter({ hasText: 'Client & Service' })).toBeVisible();
        await (0, test_1.expect)(page.locator('.form-section h2').filter({ hasText: 'Schedule' })).toBeVisible();
        await (0, test_1.expect)(page.locator('.form-section h2').filter({ hasText: 'Service Location' })).toBeVisible();
        await (0, test_1.expect)(page.locator('.form-section h2').filter({ hasText: 'Pricing' })).toBeVisible();
        await (0, test_1.expect)(page.locator('.form-section h2').filter({ hasText: 'Additional Details' })).toBeVisible();
    });
    (0, test_1.test)('should have one-time booking selected by default', async ({ page }) => {
        // Verify one-time is selected by default
        const oneTimeRadio = page.locator('input[name="bookingType"][value="one_time"]');
        await (0, test_1.expect)(oneTimeRadio).toBeChecked();
        // Verify recurring is not selected
        const recurringRadio = page.locator('input[name="bookingType"][value="recurring"]');
        await (0, test_1.expect)(recurringRadio).not.toBeChecked();
        // Verify recurrence options are hidden
        const recurrenceOptions = page.locator('#recurrenceOptions');
        await (0, test_1.expect)(recurrenceOptions).not.toHaveClass(/visible/);
    });
    (0, test_1.test)('should show recurrence options when recurring is selected', async ({ page }) => {
        // Click on recurring option
        await page.click('.radio-option[data-booking-type="recurring"]');
        // Verify recurrence options are now visible
        const recurrenceOptions = page.locator('#recurrenceOptions');
        await (0, test_1.expect)(recurrenceOptions).toHaveClass(/visible/);
        // Verify recurrence pattern dropdown is present
        await (0, test_1.expect)(page.locator('#recurrencePattern')).toBeVisible();
        await (0, test_1.expect)(page.locator('#recurrenceEndDate')).toBeVisible();
    });
    (0, test_1.test)('should hide recurrence options when switching back to one-time', async ({ page }) => {
        // First, select recurring
        await page.click('.radio-option[data-booking-type="recurring"]');
        await (0, test_1.expect)(page.locator('#recurrenceOptions')).toHaveClass(/visible/);
        // Then switch back to one-time
        await page.click('.radio-option[data-booking-type="one_time"]');
        // Verify recurrence options are hidden again
        await (0, test_1.expect)(page.locator('#recurrenceOptions')).not.toHaveClass(/visible/);
    });
    (0, test_1.test)('should have client and service dropdowns', async ({ page }) => {
        // Verify client dropdown exists
        const clientSelect = page.locator('#clientId');
        await (0, test_1.expect)(clientSelect).toBeVisible();
        // Verify service dropdown exists
        const serviceSelect = page.locator('#serviceId');
        await (0, test_1.expect)(serviceSelect).toBeVisible();
    });
    (0, test_1.test)('should have date and time inputs', async ({ page }) => {
        // Verify date input exists and has today as default
        const dateInput = page.locator('#scheduledDate');
        await (0, test_1.expect)(dateInput).toBeVisible();
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        await (0, test_1.expect)(dateInput).toHaveValue(today);
        // Verify time inputs exist
        await (0, test_1.expect)(page.locator('#scheduledStartTime')).toBeVisible();
        await (0, test_1.expect)(page.locator('#scheduledEndTime')).toBeVisible();
    });
    (0, test_1.test)('should have priority dropdown with correct options', async ({ page }) => {
        const prioritySelect = page.locator('#priority');
        await (0, test_1.expect)(prioritySelect).toBeVisible();
        // Verify default value is 'normal'
        await (0, test_1.expect)(prioritySelect).toHaveValue('normal');
        // Verify all options are present
        const options = await prioritySelect.locator('option').allTextContents();
        (0, test_1.expect)(options).toContain('Normal');
        (0, test_1.expect)(options).toContain('Low');
        (0, test_1.expect)(options).toContain('High');
        (0, test_1.expect)(options).toContain('Urgent');
    });
    (0, test_1.test)('should have service location fields', async ({ page }) => {
        await (0, test_1.expect)(page.locator('#serviceAddressLine1')).toBeVisible();
        await (0, test_1.expect)(page.locator('#serviceAddressLine2')).toBeVisible();
        await (0, test_1.expect)(page.locator('#serviceCity')).toBeVisible();
        await (0, test_1.expect)(page.locator('#serviceState')).toBeVisible();
        await (0, test_1.expect)(page.locator('#servicePostalCode')).toBeVisible();
    });
    (0, test_1.test)('should have pricing fields', async ({ page }) => {
        await (0, test_1.expect)(page.locator('#quotedPrice')).toBeVisible();
        await (0, test_1.expect)(page.locator('#priceCurrency')).toBeVisible();
        // Verify USD is default currency
        await (0, test_1.expect)(page.locator('#priceCurrency')).toHaveValue('USD');
    });
    (0, test_1.test)('should have additional details textareas', async ({ page }) => {
        await (0, test_1.expect)(page.locator('#specialInstructions')).toBeVisible();
        await (0, test_1.expect)(page.locator('#internalNotes')).toBeVisible();
    });
    (0, test_1.test)('should have submit and reset buttons', async ({ page }) => {
        const submitBtn = page.locator('#submitBtn');
        await (0, test_1.expect)(submitBtn).toBeVisible();
        await (0, test_1.expect)(submitBtn).toHaveText('Create Booking');
        const resetBtn = page.locator('button.btn-secondary');
        await (0, test_1.expect)(resetBtn).toBeVisible();
        await (0, test_1.expect)(resetBtn).toHaveText('Reset Form');
    });
    (0, test_1.test)('should reset form when reset button is clicked', async ({ page }) => {
        // Fill in some form fields
        await page.fill('#scheduledStartTime', '10:00');
        await page.fill('#serviceCity', 'Boston');
        await page.selectOption('#priority', 'high');
        // Select recurring
        await page.click('.radio-option[data-booking-type="recurring"]');
        await (0, test_1.expect)(page.locator('#recurrenceOptions')).toHaveClass(/visible/);
        // Click reset button
        await page.click('button.btn-secondary');
        // Verify fields are reset
        await (0, test_1.expect)(page.locator('#scheduledStartTime')).toHaveValue('');
        await (0, test_1.expect)(page.locator('#serviceCity')).toHaveValue('');
        await (0, test_1.expect)(page.locator('#priority')).toHaveValue('normal');
        // Verify booking type is reset to one-time
        await (0, test_1.expect)(page.locator('input[name="bookingType"][value="one_time"]')).toBeChecked();
        await (0, test_1.expect)(page.locator('#recurrenceOptions')).not.toHaveClass(/visible/);
    });
    (0, test_1.test)('should have recurrence pattern options', async ({ page }) => {
        // Show recurrence options
        await page.click('.radio-option[data-booking-type="recurring"]');
        const patternSelect = page.locator('#recurrencePattern');
        const options = await patternSelect.locator('option').allTextContents();
        (0, test_1.expect)(options).toContain('Select pattern...');
        (0, test_1.expect)(options).toContain('Daily');
        (0, test_1.expect)(options).toContain('Weekly');
        (0, test_1.expect)(options).toContain('Biweekly');
        (0, test_1.expect)(options).toContain('Monthly');
        (0, test_1.expect)(options).toContain('Quarterly');
        (0, test_1.expect)(options).toContain('Yearly');
    });
    (0, test_1.test)('should be responsive on mobile viewport', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        // Verify page still loads and is functional
        await (0, test_1.expect)(page.locator('header h1')).toBeVisible();
        await (0, test_1.expect)(page.locator('#bookingForm')).toBeVisible();
        // Verify form is still usable
        await page.fill('#scheduledStartTime', '09:00');
        await (0, test_1.expect)(page.locator('#scheduledStartTime')).toHaveValue('09:00');
    });
});
test_1.test.describe('Booking Creation UI - API Integration', () => {
    (0, test_1.test)('should attempt to load clients on page load', async ({ page }) => {
        // Listen for the clients API call
        const clientsRequest = page.waitForRequest(request => request.url().includes('/api/v1/clients') && request.method() === 'GET');
        // Navigate to the page
        await page.goto('/ui/booking-create.html');
        // Wait for the clients request
        await clientsRequest;
    });
    (0, test_1.test)('should attempt to load services on page load', async ({ page }) => {
        // Listen for the services API call
        const servicesRequest = page.waitForRequest(request => request.url().includes('/api/v1/services') && request.method() === 'GET');
        // Navigate to the page
        await page.goto('/ui/booking-create.html');
        // Wait for the services request
        await servicesRequest;
    });
    (0, test_1.test)('should submit form data to bookings API', async ({ page }) => {
        // Mock the API responses for clients and services
        await page.route('**/api/v1/clients*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [
                        { id: 'client-1', name: 'Test Client', companyName: 'Test Company' }
                    ]
                })
            });
        });
        await page.route('**/api/v1/services*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [
                        { id: 'service-1', name: 'Test Service', code: 'TS001', basePrice: 99.99 }
                    ]
                })
            });
        });
        // Navigate to the page
        await page.goto('/ui/booking-create.html');
        // Wait for dropdowns to load
        await page.waitForSelector('#clientId option[value="client-1"]');
        await page.waitForSelector('#serviceId option[value="service-1"]');
        // Fill the form
        await page.selectOption('#clientId', 'client-1');
        await page.selectOption('#serviceId', 'service-1');
        await page.fill('#scheduledStartTime', '10:00');
        // Mock the booking creation API
        let capturedBookingData = null;
        await page.route('**/api/v1/bookings', async (route) => {
            capturedBookingData = JSON.parse(route.request().postData() || '{}');
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: {
                        id: 'new-booking-id',
                        bookingNumber: 'BK-001',
                        clientId: 'client-1',
                        serviceId: 'service-1'
                    }
                })
            });
        });
        // Submit the form
        await page.click('#submitBtn');
        // Wait for success alert
        await page.waitForSelector('.alert-success.visible');
        await (0, test_1.expect)(page.locator('.alert-success')).toContainText('Booking created successfully');
        // Verify the booking data was captured
        (0, test_1.expect)(capturedBookingData).toBeTruthy();
        (0, test_1.expect)(capturedBookingData.clientId).toBe('client-1');
        (0, test_1.expect)(capturedBookingData.serviceId).toBe('service-1');
        (0, test_1.expect)(capturedBookingData.bookingType).toBe('one_time');
    });
    (0, test_1.test)('should show error message when API fails', async ({ page }) => {
        // Mock the API responses for clients and services
        await page.route('**/api/v1/clients*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [{ id: 'client-1', name: 'Test Client' }]
                })
            });
        });
        await page.route('**/api/v1/services*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [{ id: 'service-1', name: 'Test Service' }]
                })
            });
        });
        // Navigate to the page
        await page.goto('/ui/booking-create.html');
        // Wait for dropdowns to load
        await page.waitForSelector('#clientId option[value="client-1"]');
        await page.waitForSelector('#serviceId option[value="service-1"]');
        // Fill the form
        await page.selectOption('#clientId', 'client-1');
        await page.selectOption('#serviceId', 'service-1');
        await page.fill('#scheduledStartTime', '10:00');
        // Mock the booking creation API to fail
        await page.route('**/api/v1/bookings', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    error: {
                        message: 'Validation failed: Invalid date format'
                    }
                })
            });
        });
        // Submit the form
        await page.click('#submitBtn');
        // Wait for error alert
        await page.waitForSelector('.alert-error.visible');
        await (0, test_1.expect)(page.locator('.alert-error')).toContainText('Validation failed');
    });
    (0, test_1.test)('should submit recurring booking with recurrence pattern', async ({ page }) => {
        // Mock the API responses for clients and services
        await page.route('**/api/v1/clients*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [{ id: 'client-1', name: 'Test Client' }]
                })
            });
        });
        await page.route('**/api/v1/services*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [{ id: 'service-1', name: 'Test Service' }]
                })
            });
        });
        // Navigate to the page
        await page.goto('/ui/booking-create.html');
        // Wait for dropdowns to load
        await page.waitForSelector('#clientId option[value="client-1"]');
        await page.waitForSelector('#serviceId option[value="service-1"]');
        // Fill the form
        await page.selectOption('#clientId', 'client-1');
        await page.selectOption('#serviceId', 'service-1');
        await page.fill('#scheduledStartTime', '10:00');
        // Select recurring booking
        await page.click('.radio-option[data-booking-type="recurring"]');
        await page.selectOption('#recurrencePattern', 'weekly');
        // Mock the booking creation API
        let capturedBookingData = null;
        await page.route('**/api/v1/bookings', async (route) => {
            capturedBookingData = JSON.parse(route.request().postData() || '{}');
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: {
                        id: 'new-recurring-booking',
                        bookingNumber: 'BK-002',
                        bookingType: 'recurring',
                        recurrencePattern: 'weekly'
                    }
                })
            });
        });
        // Submit the form
        await page.click('#submitBtn');
        // Wait for success
        await page.waitForSelector('.alert-success.visible');
        // Verify the booking data includes recurrence info
        (0, test_1.expect)(capturedBookingData.bookingType).toBe('recurring');
        (0, test_1.expect)(capturedBookingData.recurrencePattern).toBe('weekly');
    });
});
//# sourceMappingURL=booking-create-ui-verification.e2e.spec.js.map