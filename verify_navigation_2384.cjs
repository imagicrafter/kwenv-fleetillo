const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // Login
    console.log('Logging in...');
    await page.request.post('http://localhost:8080/api/login', {
      data: { password: 'demo01132026' }
    });

    // Test navigation from index.html
    console.log('Testing navigation from index.html...');
    await page.goto('http://localhost:8080/index.html', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(1000);

    // Check if Drivers link exists and has correct href
    const driversLink = await page.$('a[href="drivers.html"].nav-item');
    if (!driversLink) {
      throw new Error('Drivers link not found in index.html');
    }
    console.log('✅ Drivers link found in index.html');

    // Check if "New" badge is removed
    const hasBadge = await page.$('a[href="drivers.html"] .badge.new');
    if (hasBadge) {
      throw new Error('"New" badge still present in index.html');
    }
    console.log('✅ "New" badge removed from index.html');

    // Click the link and verify navigation
    await driversLink.click();
    await page.waitForTimeout(1500);

    const currentUrl = page.url();
    if (!currentUrl.includes('drivers.html')) {
      throw new Error(`Navigation failed, current URL: ${currentUrl}`);
    }
    console.log('✅ Navigation to drivers.html successful');

    await page.screenshot({ path: '.playwright-mcp/task_2384_drivers_page_from_index.png' });

    // Test from another page (bookings)
    console.log('\nTesting navigation from bookings.html...');
    await page.goto('http://localhost:8080/bookings.html', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(1000);

    const driversLinkBookings = await page.$('a[href="drivers.html"].nav-item');
    if (!driversLinkBookings) {
      throw new Error('Drivers link not found in bookings.html');
    }
    console.log('✅ Drivers link found in bookings.html');

    const hasBadgeBookings = await page.$('a[href="drivers.html"] .badge.new');
    if (hasBadgeBookings) {
      throw new Error('"New" badge still present in bookings.html');
    }
    console.log('✅ "New" badge removed from bookings.html');

    // Test from vehicles page
    console.log('\nTesting navigation from vehicles.html...');
    await page.goto('http://localhost:8080/vehicles.html', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(1000);

    const driversLinkVehicles = await page.$('a[href="drivers.html"].nav-item');
    if (!driversLinkVehicles) {
      throw new Error('Drivers link not found in vehicles.html');
    }
    console.log('✅ Drivers link found in vehicles.html');

    await page.screenshot({ path: '.playwright-mcp/task_2384_navigation_complete.png' });

    // Filter critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('RPC Error') &&
      !err.includes('Failed to load') &&
      !err.includes('400 (Bad Request)') &&
      !err.includes('Failed to load resource')
    );

    if (criticalErrors.length > 0) {
      console.error('⚠️  Console errors:');
      criticalErrors.forEach(err => console.error('  -', err));
    }

    console.log('\n✅ Task 2384 complete - Navigation links updated successfully!');
    console.log(JSON.stringify({
      success: true,
      linksUpdated: true,
      badgesRemoved: true,
      navigationWorks: true,
      consoleErrors: criticalErrors.length
    }, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2384_ERROR.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
