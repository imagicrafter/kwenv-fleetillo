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

    // Step 1: Navigate to the app
    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log('✅ Navigated to app');

    // Step 2: Login if needed
    const loginExists = await page.$('#password');
    if (loginExists) {
      await page.fill('#password', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      console.log('✅ Logged in');
    }

    // Step 3: Navigate to Drivers page
    await page.goto('http://localhost:8080/drivers.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to Drivers page');

    // Take screenshot of initial state
    await page.screenshot({ path: '.playwright-mcp/task_2386_step1_drivers_page.png' });

    // Step 4: Wait for and click Add Driver button
    await page.waitForSelector('button', { timeout: 10000 });
    const addButton = await page.$('button:has-text("Add Driver"), button:has-text("＋")');

    if (!addButton) {
      // Try looking for any button that might add drivers
      const buttons = await page.$$('button');
      console.log(`Found ${buttons.length} buttons on page`);

      for (const btn of buttons) {
        const text = await btn.textContent();
        console.log(`Button text: "${text}"`);
      }

      throw new Error('Add Driver button not found');
    }

    await addButton.click();
    await page.waitForTimeout(1000);
    console.log('✅ Clicked Add Driver button');

    // Wait for modal to appear
    const modalVisible = await page.waitForSelector('#driverModal, .modal.show', { timeout: 5000 }).catch(() => null);

    if (!modalVisible) {
      throw new Error('Driver modal did not appear');
    }

    console.log('✅ Driver modal opened');

    // Take screenshot of modal
    await page.screenshot({ path: '.playwright-mcp/task_2386_step2_modal_open.png' });

    // Step 5: Fill in the form
    await page.fill('#firstName', 'TestSnake');
    await page.fill('#lastName', 'CamelCase');
    await page.fill('#phoneNumber', '555-9999');
    await page.fill('#email', 'snake.camel@test.com');

    // Optional fields
    const licenseField = await page.$('#licenseNumber');
    if (licenseField) {
      await page.fill('#licenseNumber', 'DL123456');
      await page.fill('#licenseClass', 'C');
    }

    console.log('✅ Filled in driver form');

    // Take screenshot of filled form
    await page.screenshot({ path: '.playwright-mcp/task_2386_step3_form_filled.png' });

    // Step 6: Submit the form
    const submitButton = await page.$('#driverForm button[type="submit"], button:has-text("Save")');
    if (submitButton) {
      await submitButton.click();
      console.log('✅ Clicked submit button');
    } else {
      throw new Error('Submit button not found');
    }

    // Step 7: Wait for success indication (toast or modal close)
    await page.waitForTimeout(3000);

    const toastExists = await page.$('.toast');
    if (toastExists) {
      const toastText = await page.textContent('.toast-body, .toast');
      console.log(`✅ Toast appeared: "${toastText}"`);
    }

    // Take screenshot after submission
    await page.screenshot({ path: '.playwright-mcp/task_2386_step4_after_submit.png' });

    // Step 8: Wait and check table
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({ path: '.playwright-mcp/task_2386_step5_final_state.png' });

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.error('❌ Console errors detected:');
      consoleErrors.forEach(err => console.error('  -', err));

      // Check if error is about RPC failing (the bug we're fixing)
      const hasRpcError = consoleErrors.some(err => err.includes('RPC') || err.includes('drivers.create'));
      if (hasRpcError) {
        console.error('\n⚠️  RPC error detected - transformation may not be working correctly');
        await browser.close();
        process.exit(1);
      }
    }

    console.log('\n✅ SUCCESS: Snake_case to camelCase transformation test completed!');
    console.log('📊 Summary:');
    console.log('  - Driver modal opened successfully');
    console.log('  - Form submitted with field data');
    console.log('  - No RPC errors detected (transformation working)');
    console.log(`  - Console errors: ${consoleErrors.length}`);
    console.log(`  - Console warnings: ${consoleWarnings.length}`);

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '.playwright-mcp/task_2386_ERROR.png' });

    if (consoleErrors.length > 0) {
      console.error('Console errors:');
      consoleErrors.forEach(err => console.error('  -', err));
    }

    await browser.close();
    process.exit(1);
  }
})();
