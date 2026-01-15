const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Set up console monitoring
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // Login first via API
    console.log('Logging in via API...');
    const loginResponse = await page.request.post('http://localhost:8080/api/login', {
      data: { password: 'demo01132026' }
    });

    if (!loginResponse.ok()) {
      throw new Error('Login failed: ' + await loginResponse.text());
    }

    console.log('✅ Login successful');

    // Now navigate to drivers page
    console.log('Navigating to drivers page...');
    await page.goto('http://localhost:8080/drivers.html', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('login')) {
      throw new Error('Still on login page after authentication');
    }

    console.log('✅ Reached drivers page');
    await page.screenshot({ path: '.playwright-mcp/task_2382_drivers_page_authenticated.png' });

    // Check functions exist
    const functionsCheck = await page.evaluate(() => {
      return {
        populateVehicleDropdown: typeof window.populateVehicleDropdown === 'function',
        openVehicleAssignModal: typeof window.openVehicleAssignModal === 'function',
        closeVehicleAssignModal: typeof window.closeVehicleAssignModal === 'function',
        confirmVehicleAssignment: typeof window.confirmVehicleAssignment === 'function'
      };
    });

    console.log('Functions:', functionsCheck);

    if (!functionsCheck.populateVehicleDropdown) throw new Error('populateVehicleDropdown not found');
    if (!functionsCheck.openVehicleAssignModal) throw new Error('openVehicleAssignModal not found');
    if (!functionsCheck.closeVehicleAssignModal) throw new Error('closeVehicleAssignModal not found');
    if (!functionsCheck.confirmVehicleAssignment) throw new Error('confirmVehicleAssignment not found');

    console.log('✅ All vehicle assignment functions implemented');

    // Test modal
    console.log('Testing modal...');
    await page.evaluate(() => {
      window.openVehicleAssignModal(999, 'John Doe');
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/task_2382_modal_opened.png' });

    const modalVisible = await page.evaluate(() => {
      const modal = document.getElementById('vehicle-assign-modal');
      return modal && modal.style.display === 'block';
    });

    if (!modalVisible) throw new Error('Modal did not open');
    console.log('✅ Modal opens correctly');

    const driverName = await page.textContent('#assign-driver-name');
    console.log('✅ Driver name in modal:', driverName);

    // Close modal
    await page.evaluate(() => window.closeVehicleAssignModal());
    await page.waitForTimeout(300);

    const modalClosed = await page.evaluate(() => {
      return document.getElementById('vehicle-assign-modal').style.display === 'none';
    });

    if (!modalClosed) throw new Error('Modal did not close');
    console.log('✅ Modal closes correctly');

    await page.screenshot({ path: '.playwright-mcp/task_2382_complete.png' });

    if (consoleErrors.length > 0) {
      console.error('⚠️  Console errors:');
      consoleErrors.forEach(err => console.error('  -', err));
    }

    console.log('\n✅ Task 2382 complete - Vehicle assignment JavaScript verified!');
    console.log(JSON.stringify({
      success: true,
      allFunctionsImplemented: true,
      modalWorking: true,
      consoleErrors: consoleErrors.length
    }, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2382_ERROR.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
