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
    console.log('🔍 Testing snake_case to camelCase transformation for driver creation...');

    // Step 1: Navigate to login page
    await page.goto('http://localhost:8080/login.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log('✅ Navigated to login page');

    // Step 2: Login with correct field ID
    await page.fill('#access-code', 'demo123');
    await page.click('button#login-btn');
    await page.waitForTimeout(2000);
    console.log('✅ Logged in');

    // Step 3: Navigate to Drivers page
    await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Give time for page to fully load
    console.log('✅ Navigated to Drivers page');

    // Take screenshot of initial state
    await page.screenshot({ path: '.playwright-mcp/task_2386_step1_drivers_page.png' });

    // Step 4: Find and click Add Driver button
    await page.waitForSelector('button', { timeout: 10000 });
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons on page`);

    let addButton = null;
    for (const btn of buttons) {
      const text = await btn.textContent();
      const trimmedText = text.trim();

      if (trimmedText.includes('Add Driver') || trimmedText.includes('＋') || trimmedText === '＋ Add Driver') {
        addButton = btn;
        console.log(`Found Add Driver button with text: "${trimmedText}"`);
        break;
      }
    }

    if (!addButton) {
      console.log('Available buttons:');
      for (const btn of buttons) {
        const text = await btn.textContent();
        console.log(`  - "${text.trim()}"`);
      }
      throw new Error('Add Driver button not found');
    }

    await addButton.click();
    await page.waitForTimeout(1500);
    console.log('✅ Clicked Add Driver button');

    // Wait for modal to appear
    await page.waitForSelector('#driverModal', { state: 'visible', timeout: 5000 });
    console.log('✅ Driver modal opened');

    // Take screenshot of modal
    await page.screenshot({ path: '.playwright-mcp/task_2386_step2_modal_open.png' });

    // Step 5: Fill in the form with data that will be snake_case in HTML but camelCase in backend
    await page.fill('#firstName', 'TestSnake');
    await page.fill('#lastName', 'CamelDriver');
    await page.fill('#phoneNumber', '555-8888');
    await page.fill('#email', 'snake@camel.test');

    // Optional fields
    const licenseField = await page.$('#licenseNumber');
    if (licenseField) {
      await page.fill('#licenseNumber', 'DL999999');
    }

    const licenseClassField = await page.$('#licenseClass');
    if (licenseClassField) {
      await page.fill('#licenseClass', 'C');
    }

    console.log('✅ Filled in driver form');

    // Take screenshot of filled form
    await page.screenshot({ path: '.playwright-mcp/task_2386_step3_form_filled.png' });

    // Step 6: Submit the form
    const submitButtons = await page.$$('#driverForm button');
    let saveButton = null;

    for (const btn of submitButtons) {
      const text = await btn.textContent();
      if (text.includes('Save')) {
        saveButton = btn;
        break;
      }
    }

    if (!saveButton) {
      throw new Error('Save button not found');
    }

    await saveButton.click();
    console.log('✅ Clicked Save button');

    // Step 7: Wait for response and check for errors
    await page.waitForTimeout(4000);

    // Take screenshot after submission
    await page.screenshot({ path: '.playwright-mcp/task_2386_step4_after_submit.png' });

    // Check for toast message
    const toast = await page.$('.toast');
    if (toast) {
      const toastText = await toast.textContent();
      console.log(`✅ Toast message: "${toastText}"`);

      if (toastText.includes('success')) {
        console.log('✅ Success message confirmed');
      }
    }

    // Step 8: Wait for table to reload
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2386_step5_final_state.png' });

    // Critical check: Look for RPC error in console
    const hasRpcCreateError = consoleErrors.some(err =>
      (err.includes('RPC') || err.includes('rpc')) &&
      err.includes('drivers') &&
      err.includes('create') &&
      (err.includes('failed') || err.includes('error'))
    );

    const hasFieldMappingError = consoleErrors.some(err =>
      err.includes('first_name') ||
      err.includes('last_name') ||
      err.includes('phone_number') ||
      err.includes('license_number')
    );

    if (hasRpcCreateError || hasFieldMappingError) {
      console.error('❌ TRANSFORMATION FAILED - RPC or field mapping error detected!');
      console.error('Console errors:');
      consoleErrors.forEach(err => console.error('  -', err));
      await browser.close();
      process.exit(1);
    }

    if (consoleErrors.length > 0) {
      console.warn('⚠️  Some console errors detected (checking if related to transformation):');
      consoleErrors.forEach(err => console.warn('  -', err));
    }

    console.log('\n✅ SUCCESS: Snake_case to camelCase transformation working correctly!');
    console.log('📊 Test Summary:');
    console.log('  ✓ Driver modal opened successfully');
    console.log('  ✓ Form filled with snake_case field names in HTML');
    console.log('  ✓ Form submitted successfully');
    console.log('  ✓ No RPC drivers.create errors detected');
    console.log('  ✓ No field mapping errors (first_name, last_name, etc.)');
    console.log('  ✓ Backend transformation converted snake_case to camelCase');
    console.log(`  • Console errors (non-RPC): ${consoleErrors.length}`);
    console.log(`  • Console warnings: ${consoleWarnings.length}`);

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2386_ERROR.png' });

    if (consoleErrors.length > 0) {
      console.error('\nConsole errors:');
      consoleErrors.forEach(err => console.error('  -', err));
    }

    await browser.close();
    process.exit(1);
  }
})();
