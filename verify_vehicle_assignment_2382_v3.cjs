const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set up console monitoring
  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:8080/login.html', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Try to login with demo password
    console.log('Attempting login...');
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.fill('demo123');
      const loginButton = await page.$('button[type="submit"], button:has-text("Login")');
      if (loginButton) {
        await loginButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Now navigate to drivers page
    console.log('Navigating to drivers page...');
    await page.goto('http://localhost:8080/drivers.html', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2382_drivers_page.png' });

    // Check if we're still on login or on drivers page
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('login')) {
      console.log('⚠️  Still on login page, checking page source...');
      const pageContent = await page.content();
      console.log('Page title:', await page.title());
    }

    // Check if table exists
    const tableExists = await page.$('.data-table');
    if (!tableExists) {
      console.log('⚠️  Table not found, but continuing to check functions...');
    } else {
      console.log('✅ Table element exists');
    }

    // Check if vehicle assignment functions exist
    const functionsCheck = await page.evaluate(() => {
      return {
        populateVehicleDropdown: typeof window.populateVehicleDropdown === 'function',
        openVehicleAssignModal: typeof window.openVehicleAssignModal === 'function',
        closeVehicleAssignModal: typeof window.closeVehicleAssignModal === 'function',
        confirmVehicleAssignment: typeof window.confirmVehicleAssignment === 'function'
      };
    });

    console.log('Function check:', functionsCheck);

    if (!functionsCheck.populateVehicleDropdown ||
        !functionsCheck.openVehicleAssignModal ||
        !functionsCheck.closeVehicleAssignModal ||
        !functionsCheck.confirmVehicleAssignment) {
      console.log('⚠️  Not all functions found - may be on wrong page');
      console.log('Checking if JavaScript has syntax errors...');

      // Try to load the HTML file directly and check for script errors
      const scriptContent = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script:not([src])'));
        return scripts.map(s => s.textContent.substring(0, 200)).join('\n---\n');
      });

      console.log('Found inline scripts (first 200 chars each)');
      throw new Error('Functions not found - possible auth issue or JS error');
    }
    console.log('✅ All vehicle assignment functions exist');

    // Check modal exists
    const modalExists = await page.$('#vehicle-assign-modal');
    if (!modalExists) {
      throw new Error('Vehicle assignment modal not found');
    }
    console.log('✅ Vehicle assignment modal exists');

    // Test modal functionality
    console.log('Testing modal functionality...');
    await page.evaluate(() => {
      window.openVehicleAssignModal(1, 'Test Driver');
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-mcp/task_2382_modal_opened.png' });

    const modalVisible = await page.evaluate(() => {
      const modal = document.getElementById('vehicle-assign-modal');
      return modal && modal.style.display === 'block';
    });

    if (!modalVisible) {
      throw new Error('Modal did not open');
    }
    console.log('✅ Modal opens correctly');

    // Check modal contents
    const driverName = await page.textContent('#assign-driver-name');
    if (driverName !== 'Test Driver') {
      throw new Error('Driver name not set correctly in modal');
    }
    console.log('✅ Driver name displayed:', driverName);

    // Test close
    await page.evaluate(() => window.closeVehicleAssignModal());
    await page.waitForTimeout(300);

    const modalClosed = await page.evaluate(() => {
      const modal = document.getElementById('vehicle-assign-modal');
      return modal.style.display === 'none';
    });

    if (!modalClosed) {
      throw new Error('Modal did not close');
    }
    console.log('✅ Modal closes correctly');

    await page.screenshot({ path: '.playwright-mcp/task_2382_verification_complete.png' });

    // Final check for console errors
    if (consoleErrors.length > 0) {
      console.error('⚠️  Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));
    }

    console.log('\n✅ Task 2382 verification complete!');
    console.log(JSON.stringify({
      success: true,
      functionsImplemented: true,
      modalTested: true,
      consoleErrors: consoleErrors.length,
      message: 'Vehicle assignment JavaScript functionality verified'
    }, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2382_ERROR.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
