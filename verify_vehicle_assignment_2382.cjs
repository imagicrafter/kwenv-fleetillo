const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set up console error monitoring
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // Navigate to drivers page
    console.log('Navigating to drivers page...');
    await page.goto('http://localhost:8080/drivers.html', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    // Wait for page to load
    await page.waitForSelector('.data-table', { timeout: 5000 });
    console.log('✅ Drivers page loaded');

    // Take initial screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2382_drivers_page_loaded.png' });

    // Check if vehicle assignment functions exist
    const vehicleAssignFunctionsExist = await page.evaluate(() => {
      return typeof window.populateVehicleDropdown === 'function' &&
             typeof window.openVehicleAssignModal === 'function' &&
             typeof window.closeVehicleAssignModal === 'function' &&
             typeof window.confirmVehicleAssignment === 'function';
    });

    if (!vehicleAssignFunctionsExist) {
      throw new Error('Vehicle assignment functions not found');
    }
    console.log('✅ Vehicle assignment functions exist');

    // Check if Assign Vehicle buttons exist in table
    const assignButtons = await page.$$('button[title="Assign Vehicle"]');
    console.log(`✅ Found ${assignButtons.length} Assign Vehicle buttons`);

    // If there are drivers, test the assign modal
    if (assignButtons.length > 0) {
      console.log('Testing vehicle assignment modal...');

      // Click first Assign button
      await assignButtons[0].click();
      await page.waitForTimeout(500);

      // Check if modal is visible
      const modalVisible = await page.isVisible('#vehicle-assign-modal');
      if (!modalVisible) {
        throw new Error('Vehicle assignment modal did not appear');
      }
      console.log('✅ Vehicle assignment modal opened');

      // Take screenshot of modal
      await page.screenshot({ path: '.playwright-mcp/task_2382_vehicle_assign_modal.png' });

      // Check modal contents
      const driverNameExists = await page.isVisible('#assign-driver-name');
      const vehicleSelectExists = await page.isVisible('#vehicle-select');

      if (!driverNameExists || !vehicleSelectExists) {
        throw new Error('Modal elements missing');
      }
      console.log('✅ Modal elements present');

      // Check vehicle dropdown options
      const options = await page.$$('#vehicle-select option');
      console.log(`✅ Vehicle dropdown has ${options.length} options`);

      // Test closing modal
      await page.click('.close-modal');
      await page.waitForTimeout(300);

      const modalHidden = await page.evaluate(() => {
        const modal = document.getElementById('vehicle-assign-modal');
        return modal.style.display === 'none';
      });

      if (!modalHidden) {
        throw new Error('Modal did not close');
      }
      console.log('✅ Modal closes correctly');

      // Take final screenshot
      await page.screenshot({ path: '.playwright-mcp/task_2382_modal_closed.png' });
    } else {
      console.log('⚠️ No drivers found to test assignment modal');
      // Still take a screenshot showing no drivers
      await page.screenshot({ path: '.playwright-mcp/task_2382_no_drivers.png' });
    }

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.error('❌ Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));
      await page.screenshot({ path: '.playwright-mcp/task_2382_ERROR.png' });
      process.exit(1);
    }

    console.log('\n✅ All tests passed!');
    console.log(JSON.stringify({
      success: true,
      functionsImplemented: true,
      assignButtonsFound: assignButtons.length,
      consoleErrors: 0,
      consoleWarnings: consoleWarnings.length,
      message: 'Vehicle assignment functionality working correctly'
    }, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2382_ERROR.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
