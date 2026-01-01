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

import { test, expect } from '@playwright/test';

test.describe('Booking Creation UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the booking creation page
    await page.goto('/ui/booking-create.html');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load the booking creation page', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle('Create Booking - RouteIQ');

    // Verify header is present
    await expect(page.locator('header h1')).toHaveText('Create New Booking');
    await expect(page.locator('header p')).toHaveText('Schedule a one-time or recurring service booking');
  });

  test('should have all required form sections', async ({ page }) => {
    // Verify form sections exist
    await expect(page.locator('.form-section h2').filter({ hasText: 'Booking Type' })).toBeVisible();
    await expect(page.locator('.form-section h2').filter({ hasText: 'Client & Service' })).toBeVisible();
    await expect(page.locator('.form-section h2').filter({ hasText: 'Schedule' })).toBeVisible();
    await expect(page.locator('.form-section h2').filter({ hasText: 'Service Location' })).toBeVisible();
    await expect(page.locator('.form-section h2').filter({ hasText: 'Pricing' })).toBeVisible();
    await expect(page.locator('.form-section h2').filter({ hasText: 'Additional Details' })).toBeVisible();
  });

  test('should have one-time booking selected by default', async ({ page }) => {
    // Verify one-time is selected by default
    const oneTimeRadio = page.locator('input[name="bookingType"][value="one_time"]');
    await expect(oneTimeRadio).toBeChecked();

    // Verify recurring is not selected
    const recurringRadio = page.locator('input[name="bookingType"][value="recurring"]');
    await expect(recurringRadio).not.toBeChecked();

    // Verify recurrence options are hidden
    const recurrenceOptions = page.locator('#recurrenceOptions');
    await expect(recurrenceOptions).not.toHaveClass(/visible/);
  });

  test('should show recurrence options when recurring is selected', async ({ page }) => {
    // Click on recurring option
    await page.click('.radio-option[data-booking-type="recurring"]');

    // Verify recurrence options are now visible
    const recurrenceOptions = page.locator('#recurrenceOptions');
    await expect(recurrenceOptions).toHaveClass(/visible/);

    // Verify recurrence pattern dropdown is present
    await expect(page.locator('#recurrencePattern')).toBeVisible();
    await expect(page.locator('#recurrenceEndDate')).toBeVisible();
  });

  test('should hide recurrence options when switching back to one-time', async ({ page }) => {
    // First, select recurring
    await page.click('.radio-option[data-booking-type="recurring"]');
    await expect(page.locator('#recurrenceOptions')).toHaveClass(/visible/);

    // Then switch back to one-time
    await page.click('.radio-option[data-booking-type="one_time"]');

    // Verify recurrence options are hidden again
    await expect(page.locator('#recurrenceOptions')).not.toHaveClass(/visible/);
  });

  test('should have client and service dropdowns', async ({ page }) => {
    // Verify client dropdown exists
    const clientSelect = page.locator('#clientId');
    await expect(clientSelect).toBeVisible();

    // Verify service dropdown exists
    const serviceSelect = page.locator('#serviceId');
    await expect(serviceSelect).toBeVisible();
  });

  test('should have date and time inputs', async ({ page }) => {
    // Verify date input exists and has today as default
    const dateInput = page.locator('#scheduledDate');
    await expect(dateInput).toBeVisible();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    await expect(dateInput).toHaveValue(today);

    // Verify time inputs exist
    await expect(page.locator('#scheduledStartTime')).toBeVisible();
    await expect(page.locator('#scheduledEndTime')).toBeVisible();
  });

  test('should have priority dropdown with correct options', async ({ page }) => {
    const prioritySelect = page.locator('#priority');
    await expect(prioritySelect).toBeVisible();

    // Verify default value is 'normal'
    await expect(prioritySelect).toHaveValue('normal');

    // Verify all options are present
    const options = await prioritySelect.locator('option').allTextContents();
    expect(options).toContain('Normal');
    expect(options).toContain('Low');
    expect(options).toContain('High');
    expect(options).toContain('Urgent');
  });

  test('should have service location fields', async ({ page }) => {
    await expect(page.locator('#serviceAddressLine1')).toBeVisible();
    await expect(page.locator('#serviceAddressLine2')).toBeVisible();
    await expect(page.locator('#serviceCity')).toBeVisible();
    await expect(page.locator('#serviceState')).toBeVisible();
    await expect(page.locator('#servicePostalCode')).toBeVisible();
  });

  test('should have pricing fields', async ({ page }) => {
    await expect(page.locator('#quotedPrice')).toBeVisible();
    await expect(page.locator('#priceCurrency')).toBeVisible();

    // Verify USD is default currency
    await expect(page.locator('#priceCurrency')).toHaveValue('USD');
  });

  test('should have additional details textareas', async ({ page }) => {
    await expect(page.locator('#specialInstructions')).toBeVisible();
    await expect(page.locator('#internalNotes')).toBeVisible();
  });

  test('should have submit and reset buttons', async ({ page }) => {
    const submitBtn = page.locator('#submitBtn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveText('Create Booking');

    const resetBtn = page.locator('button.btn-secondary');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toHaveText('Reset Form');
  });

  test('should reset form when reset button is clicked', async ({ page }) => {
    // Fill in some form fields
    await page.fill('#scheduledStartTime', '10:00');
    await page.fill('#serviceCity', 'Boston');
    await page.selectOption('#priority', 'high');

    // Select recurring
    await page.click('.radio-option[data-booking-type="recurring"]');
    await expect(page.locator('#recurrenceOptions')).toHaveClass(/visible/);

    // Click reset button
    await page.click('button.btn-secondary');

    // Verify fields are reset
    await expect(page.locator('#scheduledStartTime')).toHaveValue('');
    await expect(page.locator('#serviceCity')).toHaveValue('');
    await expect(page.locator('#priority')).toHaveValue('normal');

    // Verify booking type is reset to one-time
    await expect(page.locator('input[name="bookingType"][value="one_time"]')).toBeChecked();
    await expect(page.locator('#recurrenceOptions')).not.toHaveClass(/visible/);
  });

  test('should have recurrence pattern options', async ({ page }) => {
    // Show recurrence options
    await page.click('.radio-option[data-booking-type="recurring"]');

    const patternSelect = page.locator('#recurrencePattern');
    const options = await patternSelect.locator('option').allTextContents();

    expect(options).toContain('Select pattern...');
    expect(options).toContain('Daily');
    expect(options).toContain('Weekly');
    expect(options).toContain('Biweekly');
    expect(options).toContain('Monthly');
    expect(options).toContain('Quarterly');
    expect(options).toContain('Yearly');
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify page still loads and is functional
    await expect(page.locator('header h1')).toBeVisible();
    await expect(page.locator('#bookingForm')).toBeVisible();

    // Verify form is still usable
    await page.fill('#scheduledStartTime', '09:00');
    await expect(page.locator('#scheduledStartTime')).toHaveValue('09:00');
  });
});

test.describe('Booking Creation UI - API Integration', () => {
  test('should attempt to load clients on page load', async ({ page }) => {
    // Listen for the clients API call
    const clientsRequest = page.waitForRequest(request =>
      request.url().includes('/api/v1/clients') && request.method() === 'GET'
    );

    // Navigate to the page
    await page.goto('/ui/booking-create.html');

    // Wait for the clients request
    await clientsRequest;
  });

  test('should attempt to load services on page load', async ({ page }) => {
    // Listen for the services API call
    const servicesRequest = page.waitForRequest(request =>
      request.url().includes('/api/v1/services') && request.method() === 'GET'
    );

    // Navigate to the page
    await page.goto('/ui/booking-create.html');

    // Wait for the services request
    await servicesRequest;
  });

  test('should submit form data to bookings API', async ({ page }) => {
    // Mock the API responses for clients and services
    await page.route('**/api/v1/clients*', async route => {
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

    await page.route('**/api/v1/services*', async route => {
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
    let capturedBookingData: unknown = null;
    await page.route('**/api/v1/bookings', async route => {
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
    await expect(page.locator('.alert-success')).toContainText('Booking created successfully');

    // Verify the booking data was captured
    expect(capturedBookingData).toBeTruthy();
    expect((capturedBookingData as Record<string, unknown>).clientId).toBe('client-1');
    expect((capturedBookingData as Record<string, unknown>).serviceId).toBe('service-1');
    expect((capturedBookingData as Record<string, unknown>).bookingType).toBe('one_time');
  });

  test('should show error message when API fails', async ({ page }) => {
    // Mock the API responses for clients and services
    await page.route('**/api/v1/clients*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'client-1', name: 'Test Client' }]
        })
      });
    });

    await page.route('**/api/v1/services*', async route => {
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
    await page.route('**/api/v1/bookings', async route => {
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
    await expect(page.locator('.alert-error')).toContainText('Validation failed');
  });

  test('should submit recurring booking with recurrence pattern', async ({ page }) => {
    // Mock the API responses for clients and services
    await page.route('**/api/v1/clients*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'client-1', name: 'Test Client' }]
        })
      });
    });

    await page.route('**/api/v1/services*', async route => {
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
    let capturedBookingData: unknown = null;
    await page.route('**/api/v1/bookings', async route => {
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
    expect((capturedBookingData as Record<string, unknown>).bookingType).toBe('recurring');
    expect((capturedBookingData as Record<string, unknown>).recurrencePattern).toBe('weekly');
  });
});
